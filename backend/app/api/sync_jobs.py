from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from ..core.database import get_db
from ..core.security import credential_encryptor
from ..models import SyncJob, SyncJobRun, IDMCConnection
from ..schemas import SyncJobCreate, SyncJobUpdate, SyncJobResponse, SyncJobRunResponse
from ..services.auth_service import IDMCAuthService
from ..services.star_schema_sync_service import StarSchemaSyncService

router = APIRouter(prefix="/sync-jobs", tags=["Sync Jobs"])


async def run_sync_job_background(job_id: int, is_manual: bool = False, resume_run_id: Optional[int] = None):
    """Background task to run sync job."""
    import traceback
    import logging
    import json
    logger = logging.getLogger(__name__)

    # Create a new database session for this background task
    from ..core.database import SessionLocal
    db = SessionLocal()

    try:
        logger.info(f"[SYNC] Starting background sync job {job_id}, resume_run_id={resume_run_id}")

        job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
        if not job:
            logger.error(f"[SYNC] Job {job_id} not found")
            return

        # Get connection
        connection = db.query(IDMCConnection).filter(IDMCConnection.id == job.connection_id).first()
        if not connection:
            logger.error(f"[SYNC] Connection {job.connection_id} not found")
            return

        logger.info(f"[SYNC] Connection: {connection.name}, Org: {connection.org_name}")

        # If incremental sync and not resuming, check if a successful full sync exists
        if job.is_incremental and not resume_run_id:
            successful_full_sync = db.query(SyncJobRun).join(
                SyncJob, SyncJobRun.sync_job_id == SyncJob.id
            ).filter(
                SyncJob.connection_id == job.connection_id,
                SyncJobRun.org_id == connection.org_id,
                SyncJobRun.status == "SUCCESS",
                SyncJob.is_incremental == False  # Full sync
            ).first()

            if not successful_full_sync:
                logger.error(f"[SYNC] Cannot run incremental sync: No successful FULL sync found for org {connection.org_id}")
                # Create a failed run record
                run = SyncJobRun(
                    sync_job_id=job.id,
                    org_id=connection.org_id,
                    run_type="MANUAL" if is_manual else "SCHEDULED",
                    status="FAILED",
                    completed_at=datetime.utcnow(),
                    error_message="Cannot run incremental sync: No successful FULL sync found for this organization. Please run a FULL sync job first."
                )
                db.add(run)
                job.last_run_at = datetime.utcnow()
                job.last_run_status = "FAILED"
                db.commit()
                return

        # Decrypt password
        password = credential_encryptor.decrypt(connection.encrypted_password)

        # Get or create run record
        if resume_run_id:
            run = db.query(SyncJobRun).filter(SyncJobRun.id == resume_run_id).first()
            if not run:
                logger.error(f"[SYNC] Resume run {resume_run_id} not found")
                return
            logger.info(f"[SYNC] Resuming run {run.id} from checkpoint")
        else:
            # Create sync job run record
            run = SyncJobRun(
                sync_job_id=job.id,
                org_id=connection.org_id,  # IMPORTANT: Track which org this sync is for
                run_type="MANUAL" if is_manual else "SCHEDULED",
                status="RUNNING"
            )
            db.add(run)
            db.commit()
            db.refresh(run)
            logger.info(f"[SYNC] Created run record {run.id} for org {connection.org_id}")

        # Create auth service (use profiling_url if available)
        auth_service = IDMCAuthService(
            base_url=connection.base_url,
            username=connection.username,
            password=password,
            profiling_url=connection.profiling_url if hasattr(connection, 'profiling_url') else None
        )

        # Create sync service (using StarSchemaSyncService)
        sync_service = StarSchemaSyncService(db, auth_service, sync_run_id=run.id)

        try:
            # Load checkpoint if resuming
            checkpoint = None
            if run.checkpoint_data:
                try:
                    checkpoint = json.loads(run.checkpoint_data)
                    logger.info(f"[SYNC] Loaded checkpoint: {checkpoint}")
                except:
                    logger.warning(f"[SYNC] Failed to parse checkpoint data")

            logger.info(f"[SYNC] Starting sync_all for job {job_id}, task_limit={job.task_limit}, max_runs_per_task={job.max_runs_per_task}, checkpoint={checkpoint is not None}")
            # Run synchronization with checkpoint
            result = await sync_service.sync_all(
                incremental=job.is_incremental,
                task_limit=job.task_limit,
                max_runs_per_task=job.max_runs_per_task,
                checkpoint=checkpoint
            )
            logger.info(f"[SYNC] Sync completed: {result}")

            # Check if stopped
            if result.get("stopped"):
                run.status = "STOPPED"
                logger.info(f"[SYNC] Job stopped by user request")
            else:
                run.status = "SUCCESS" if result.get("success") else "FAILED"

            run.completed_at = datetime.utcnow()
            run.duration_seconds = int((run.completed_at - run.started_at).total_seconds())

            # Update statistics (map to existing fields)
            stats = result.get("stats", {})
            run.tasks_processed = stats.get("profiles_synced", 0)
            run.runs_processed = stats.get("runs_synced", 0)
            run.results_inserted = stats.get("statistics_synced", 0)
            run.errors_count = stats.get("errors", 0)
            run.projects_processed = 0  # Not used in new sync
            run.folders_processed = 0  # Not used in new sync
            run.execution_log = f"Profiles: {stats.get('profiles_synced', 0)}, Runs: {stats.get('runs_synced', 0)}, Stats: {stats.get('statistics_synced', 0)}, ExistingRules: {stats.get('existing_rules_processed', 0)}, OutputMappings: {stats.get('output_mappings_synced', 0)}"

            if not result.get("success") and not result.get("stopped"):
                run.error_message = result.get("error", "Unknown error")

            # Update job record
            job.last_run_at = datetime.utcnow()
            job.last_run_status = run.status

            db.commit()

        except Exception as e:
            logger.error(f"[SYNC] Error during sync: {str(e)}")
            logger.error(traceback.format_exc())
            run.status = "FAILED"
            run.completed_at = datetime.utcnow()
            run.error_message = str(e)
            run.duration_seconds = int((run.completed_at - run.started_at).total_seconds())

            job.last_run_at = datetime.utcnow()
            job.last_run_status = "FAILED"

            db.commit()

        finally:
            await auth_service.close()

    except Exception as e:
        logger.error(f"[SYNC] Fatal error in background task: {str(e)}")
        logger.error(traceback.format_exc())

    finally:
        # Close the database session
        db.close()
        logger.info(f"[SYNC] Background task completed for job {job_id}")


@router.post("/", response_model=SyncJobResponse)
def create_sync_job(job_data: SyncJobCreate, db: Session = Depends(get_db)):
    """Create a new sync job."""
    # Check if name exists
    existing = db.query(SyncJob).filter(SyncJob.name == job_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Sync job name already exists")

    # Check if connection exists
    connection = db.query(IDMCConnection).filter(IDMCConnection.id == job_data.connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Create sync job
    sync_job = SyncJob(
        name=job_data.name,
        description=job_data.description,
        connection_id=job_data.connection_id,
        schedule_type=job_data.schedule_type,
        schedule_config=job_data.schedule_config,
        is_incremental=job_data.is_incremental,
        task_limit=job_data.task_limit,
        max_runs_per_task=job_data.max_runs_per_task,
        is_active=True
    )

    db.add(sync_job)
    db.commit()
    db.refresh(sync_job)

    return sync_job


@router.get("/", response_model=List[SyncJobResponse])
def list_sync_jobs(db: Session = Depends(get_db)):
    """List all sync jobs."""
    jobs = db.query(SyncJob).all()

    # For each job, fetch the latest run's error message if it failed
    result = []
    for job in jobs:
        job_dict = {
            "id": job.id,
            "name": job.name,
            "description": job.description,
            "connection_id": job.connection_id,
            "schedule_type": job.schedule_type,
            "schedule_config": job.schedule_config,
            "is_active": job.is_active,
            "is_incremental": job.is_incremental,
            "task_limit": job.task_limit,
            "max_runs_per_task": job.max_runs_per_task,
            "last_run_at": job.last_run_at,
            "last_run_status": job.last_run_status,
            "last_run_error_message": None,
            "next_run_at": job.next_run_at,
            "created_at": job.created_at,
            "updated_at": job.updated_at
        }

        # If last run failed, get the error message
        if job.last_run_status == "FAILED":
            latest_run = db.query(SyncJobRun).filter(
                SyncJobRun.sync_job_id == job.id
            ).order_by(SyncJobRun.started_at.desc()).first()
            if latest_run:
                job_dict["last_run_error_message"] = latest_run.error_message

        result.append(job_dict)

    return result


@router.get("/{job_id}", response_model=SyncJobResponse)
def get_sync_job(job_id: int, db: Session = Depends(get_db)):
    """Get a specific sync job."""
    import logging
    logger = logging.getLogger(__name__)

    job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")

    logger.info(f"Job task_limit attribute: {hasattr(job, 'task_limit')}")
    logger.info(f"Job task_limit value: {getattr(job, 'task_limit', 'NOT FOUND')}")
    logger.info(f"Job __dict__: {job.__dict__}")

    return job


@router.put("/{job_id}", response_model=SyncJobResponse)
def update_sync_job(job_id: int, job_data: SyncJobUpdate, db: Session = Depends(get_db)):
    """Update an existing sync job."""
    import logging
    logger = logging.getLogger(__name__)

    job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")

    # Get the fields that were actually set in the request
    update_data = job_data.model_dump(exclude_unset=True)

    logger.info(f"Updating job {job_id}, received data: {update_data}")
    logger.info(f"Current task_limit: {job.task_limit}")

    # Update fields
    for field, value in update_data.items():
        if field in ['name', 'description', 'schedule_type', 'schedule_config',
                     'is_active', 'is_incremental', 'task_limit', 'max_runs_per_task']:
            logger.info(f"Setting {field} = {value}")
            setattr(job, field, value)

    job.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(job)

    logger.info(f"After update, task_limit: {job.task_limit}")

    return job


@router.delete("/{job_id}")
def delete_sync_job(job_id: int, db: Session = Depends(get_db)):
    """Delete a sync job."""
    job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")

    db.delete(job)
    db.commit()

    return {"message": "Sync job deleted successfully"}


@router.post("/{job_id}/run")
async def trigger_sync_job(job_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Manually trigger a sync job."""
    job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")

    # If incremental sync, check if a successful full sync has been run before
    if job.is_incremental:
        # Get the connection to find the org_id
        connection = db.query(IDMCConnection).filter(IDMCConnection.id == job.connection_id).first()
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")

        # Check if there's any successful full sync for this org
        successful_full_sync = db.query(SyncJobRun).join(
            SyncJob, SyncJobRun.sync_job_id == SyncJob.id
        ).filter(
            SyncJob.connection_id == job.connection_id,
            SyncJobRun.org_id == connection.org_id,
            SyncJobRun.status == "SUCCESS",
            SyncJob.is_incremental == False  # Full sync
        ).first()

        if not successful_full_sync:
            raise HTTPException(
                status_code=400,
                detail="Cannot run incremental sync: No successful FULL sync found for this organization. Please run a FULL sync job first."
            )

    # Add to background tasks (don't pass db session - it will create its own)
    background_tasks.add_task(run_sync_job_background, job_id, is_manual=True)

    return {"message": "Sync job triggered successfully", "job_id": job_id}


@router.get("/{job_id}/status")
def get_sync_job_status(job_id: int, db: Session = Depends(get_db)):
    """Get current status of a sync job including running status."""
    job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")

    # Get the most recent run
    latest_run = db.query(SyncJobRun).filter(
        SyncJobRun.sync_job_id == job_id
    ).order_by(SyncJobRun.started_at.desc()).first()

    if latest_run and latest_run.status == "RUNNING":
        # Use projects_processed field to store total_profiles count
        total_tasks = latest_run.projects_processed or 0

        # Calculate progress
        progress_percent = 0
        if total_tasks > 0 and latest_run.tasks_processed > 0:
            progress_percent = min(100, int((latest_run.tasks_processed / total_tasks) * 100))

        return {
            "job_id": job_id,
            "is_running": True,
            "run_id": latest_run.id,
            "started_at": latest_run.started_at,
            "tasks_processed": latest_run.tasks_processed,
            "total_tasks": total_tasks,
            "progress_percent": progress_percent,
            "runs_processed": latest_run.runs_processed,
            "results_inserted": latest_run.results_inserted,
            "errors_count": latest_run.errors_count,
            "error_message": latest_run.error_message
        }
    else:
        return {
            "job_id": job_id,
            "is_running": False,
            "last_run_status": latest_run.status if latest_run else None,
            "last_run_at": latest_run.completed_at if latest_run else None,
            "error_message": latest_run.error_message if latest_run else None
        }


@router.get("/{job_id}/runs", response_model=List[SyncJobRunResponse])
def get_sync_job_runs(job_id: int, limit: int = 50, db: Session = Depends(get_db)):
    """Get execution history for a sync job."""
    job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")

    runs = db.query(SyncJobRun).filter(
        SyncJobRun.sync_job_id == job_id
    ).order_by(SyncJobRun.started_at.desc()).limit(limit).all()

    return runs


@router.get("/runs/{run_id}", response_model=SyncJobRunResponse)
def get_sync_job_run(run_id: int, db: Session = Depends(get_db)):
    """Get details of a specific sync job run."""
    run = db.query(SyncJobRun).filter(SyncJobRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Sync job run not found")
    return run


@router.post("/{job_id}/stop")
def stop_sync_job(job_id: int, force: bool = False, db: Session = Depends(get_db)):
    """Request stop for a running sync job.

    Args:
        job_id: ID of the sync job to stop
        force: If True, immediately mark as STOPPED (use when server was restarted)
    """
    job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")

    # Get the running run
    running_run = db.query(SyncJobRun).filter(
        SyncJobRun.sync_job_id == job_id,
        SyncJobRun.status == "RUNNING"
    ).first()

    if not running_run:
        raise HTTPException(status_code=400, detail="No running sync job found")

    if force:
        # Immediate stop (for orphaned jobs after server restart)
        running_run.status = "STOPPED"
        running_run.completed_at = datetime.utcnow()
        if running_run.started_at:
            running_run.duration_seconds = int((running_run.completed_at - running_run.started_at).total_seconds())
        running_run.error_message = "Stopped by user (force stop)"
        db.commit()
        return {"message": "Sync job stopped immediately.", "run_id": running_run.id}
    else:
        # Graceful stop (set flag for background task to check)
        running_run.stop_requested = 1
        db.commit()
        return {"message": "Stop requested. The sync will stop after completing current profile.", "run_id": running_run.id}


@router.post("/{job_id}/resume")
async def resume_sync_job(job_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Resume a stopped sync job from last checkpoint."""
    job = db.query(SyncJob).filter(SyncJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")

    # Get the last stopped run
    stopped_run = db.query(SyncJobRun).filter(
        SyncJobRun.sync_job_id == job_id,
        SyncJobRun.status == "STOPPED"
    ).order_by(SyncJobRun.started_at.desc()).first()

    if not stopped_run:
        raise HTTPException(status_code=400, detail="No stopped sync job found to resume")

    if not stopped_run.checkpoint_data:
        raise HTTPException(status_code=400, detail="No checkpoint data available. Cannot resume.")

    # Get connection to get org_id
    connection = db.query(IDMCConnection).filter(IDMCConnection.id == job.connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Create new run for resume
    resume_run = SyncJobRun(
        sync_job_id=job.id,
        org_id=connection.org_id,  # IMPORTANT: Track which org this sync is for
        run_type="RESUME",
        status="RUNNING",
        checkpoint_data=stopped_run.checkpoint_data,
        last_processed_profile_id=stopped_run.last_processed_profile_id,
        tasks_processed=stopped_run.tasks_processed,
        runs_processed=stopped_run.runs_processed,
        results_inserted=stopped_run.results_inserted
    )
    db.add(resume_run)
    db.commit()
    db.refresh(resume_run)

    # Trigger resume in background
    background_tasks.add_task(run_sync_job_background, job_id, is_manual=False, resume_run_id=resume_run.id)

    return {"message": "Sync job resume triggered", "job_id": job_id, "run_id": resume_run.id}
