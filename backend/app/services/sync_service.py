from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from datetime import datetime, date
import asyncio
from ..models import (
    DimDQAsset, DimProfilingTask, DimProfilingRun, DimColumn,
    DimTime, DimConnection, FactProfilingResult, SyncJobRun
)
from .auth_service import IDMCAuthService
from .metadata_service import MetadataService
from .profiling_service import ProfilingService
from .logging_service import APILoggingService


class SyncService:
    """
    Orchestrates the complete data extraction pipeline from IDMC to PostgreSQL.

    This service implements the multi-step hierarchical extraction:
    1. Authenticate
    2. Fetch projects
    3. Fetch folders within projects
    4. Fetch profiling tasks/assets
    5. Fetch profiling runs (with incremental logic)
    6. Fetch profiling results
    7. Store in star schema

    Handles both full load and incremental (delta) extraction.
    """

    def __init__(
        self,
        db: Session,
        auth_service: IDMCAuthService,
        sync_job_run_id: Optional[int] = None
    ):
        self.db = db
        self.auth = auth_service
        self.sync_job_run_id = sync_job_run_id

        # Initialize logging service
        self.logging_service = APILoggingService(db)

        # Initialize API services
        self.metadata_service = MetadataService(auth_service, self.logging_service)
        self.profiling_service = ProfilingService(auth_service, self.logging_service)

        # Statistics tracking
        self.stats = {
            "projects_processed": 0,
            "folders_processed": 0,
            "tasks_processed": 0,
            "runs_processed": 0,
            "results_inserted": 0,
            "errors_count": 0,
            "execution_log": []
        }

    def _log(self, message: str):
        """Add message to execution log."""
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        self.stats["execution_log"].append(log_entry)
        print(log_entry)

    async def run_full_sync(self, is_incremental: bool = True) -> Dict[str, Any]:
        """
        Run complete synchronization pipeline.

        Args:
            is_incremental: If True, only fetch new data since last run.
                          If False, perform full load.

        Returns:
            Dictionary with sync statistics
        """
        self._log("Starting synchronization...")
        self._log(f"Mode: {'Incremental' if is_incremental else 'Full Load'}")

        try:
            # Step 1: Authenticate
            self._log("Authenticating with IDMC...")
            auth_result = await self.auth.login()
            if not auth_result.get("success"):
                raise Exception(f"Authentication failed: {auth_result.get('error')}")

            # Step 2: Fetch and sync connections
            self._log("Fetching connections...")
            await self._sync_connections()

            # Step 3: Fetch projects
            self._log("Fetching projects...")
            projects = await self.metadata_service.get_projects()
            self._log(f"Found {len(projects)} projects")

            for project in projects:
                try:
                    await self._process_project(project, is_incremental)
                except Exception as e:
                    self._log(f"Error processing project {project.get('id', 'unknown')}: {e}")
                    self.stats["errors_count"] += 1

            self._log("Synchronization completed successfully")
            return {
                "success": True,
                "stats": self.stats
            }

        except Exception as e:
            self._log(f"Synchronization failed: {str(e)}")
            self.stats["errors_count"] += 1
            return {
                "success": False,
                "error": str(e),
                "stats": self.stats
            }

    async def _sync_connections(self):
        """Fetch and store connections in dim_connection."""
        connections = await self.metadata_service.get_connections()

        for conn_data in connections:
            conn_id = conn_data.get("id") or conn_data.get("connectionId")
            if not conn_id:
                continue

            # Check if connection exists
            existing = self.db.query(DimConnection).filter_by(connection_id=conn_id).first()

            if existing:
                # Update existing connection
                existing.connection_name = conn_data.get("name") or existing.connection_name
                existing.connection_type = conn_data.get("type") or existing.connection_type
                existing.description = conn_data.get("description")
                existing.updated_at = datetime.utcnow()
            else:
                # Create new connection
                new_conn = DimConnection(
                    connection_id=conn_id,
                    connection_name=conn_data.get("name", "Unknown"),
                    connection_type=conn_data.get("type"),
                    description=conn_data.get("description"),
                    created_by=conn_data.get("createdBy"),
                    created_at=self._parse_timestamp(conn_data.get("createdAt"))
                )
                self.db.add(new_conn)

        self.db.commit()
        self._log(f"Synced {len(connections)} connections")

    async def _process_project(self, project: Dict[str, Any], is_incremental: bool):
        """Process a single project."""
        project_id = project.get("id") or project.get("projectId")
        project_name = project.get("name", "Unknown")

        self._log(f"Processing project: {project_name} ({project_id})")
        self.stats["projects_processed"] += 1

        # Fetch folders in project
        folders = await self.metadata_service.get_folders(project_id)
        self._log(f"  Found {len(folders)} folders")

        # Process root level (no folder)
        await self._process_folder(project, None, is_incremental)

        # Process each folder
        for folder in folders:
            try:
                await self._process_folder(project, folder, is_incremental)
                self.stats["folders_processed"] += 1
            except Exception as e:
                self._log(f"  Error processing folder {folder.get('id', 'unknown')}: {e}")
                self.stats["errors_count"] += 1

    async def _process_folder(
        self,
        project: Dict[str, Any],
        folder: Optional[Dict[str, Any]],
        is_incremental: bool
    ):
        """Process profiling tasks in a folder."""
        project_id = project.get("id") or project.get("projectId")
        folder_id = folder.get("id") if folder else None
        folder_name = folder.get("name") if folder else "Root"

        # Fetch profiling tasks
        tasks = await self.metadata_service.get_profiling_tasks(
            project_id=project_id,
            folder_id=folder_id
        )

        if not tasks:
            return

        self._log(f"    Folder '{folder_name}': {len(tasks)} profiling tasks")

        for task in tasks:
            try:
                await self._process_profiling_task(project, folder, task, is_incremental)
                self.stats["tasks_processed"] += 1
            except Exception as e:
                self._log(f"    Error processing task {task.get('id', 'unknown')}: {e}")
                self.stats["errors_count"] += 1

    async def _process_profiling_task(
        self,
        project: Dict[str, Any],
        folder: Optional[Dict[str, Any]],
        task: Dict[str, Any],
        is_incremental: bool
    ):
        """Process a single profiling task."""
        task_id = task.get("id") or task.get("taskId")
        task_name = task.get("name", "Unknown")

        self._log(f"      Processing task: {task_name} ({task_id})")

        # Step 1: Sync DQ Asset
        asset_id = task.get("assetId") or task.get("objectId") or task_id
        dq_asset = await self._sync_dq_asset(project, folder, task, asset_id)

        # Step 2: Sync Profiling Task
        profiling_task = await self._sync_profiling_task(task, dq_asset.dq_asset_id)

        # Step 3: Determine incremental cutoff
        since = None
        if is_incremental and profiling_task.last_successful_run_timestamp:
            since = profiling_task.last_successful_run_timestamp
            self._log(f"        Fetching runs since {since}")

        # Step 4: Fetch profiling runs
        runs = await self.profiling_service.get_profiling_runs(
            task_id=task_id,
            since=since,
            status="SUCCESS"  # Only fetch successful runs
        )

        self._log(f"        Found {len(runs)} runs to process")

        # Step 5: Process each run
        latest_run_time = profiling_task.last_successful_run_timestamp

        for run in runs:
            try:
                run_time = await self._process_profiling_run(
                    run,
                    task_id,
                    dq_asset.dq_asset_id
                )

                if run_time and (not latest_run_time or run_time > latest_run_time):
                    latest_run_time = run_time

                self.stats["runs_processed"] += 1

            except Exception as e:
                self._log(f"        Error processing run {run.get('id', 'unknown')}: {e}")
                self.stats["errors_count"] += 1

        # Update last successful run timestamp
        if latest_run_time:
            profiling_task.last_successful_run_timestamp = latest_run_time
            profiling_task.last_run_at = datetime.utcnow()
            self.db.commit()

    async def _sync_dq_asset(
        self,
        project: Dict[str, Any],
        folder: Optional[Dict[str, Any]],
        task: Dict[str, Any],
        asset_id: str
    ) -> DimDQAsset:
        """Sync DQ Asset dimension."""
        project_name = project.get("name", "Unknown")
        folder_path = folder.get("path") if folder else ""
        object_name = task.get("objectName") or task.get("name", "Unknown")

        # Construct full_path: project/folder/object
        path_parts = [project_name]
        if folder_path:
            path_parts.append(folder_path.strip('/'))
        path_parts.append(object_name)
        full_path = "/".join(path_parts)

        # Check if asset exists
        asset = self.db.query(DimDQAsset).filter_by(dq_asset_id=asset_id).first()

        if asset:
            # Update existing
            asset.project_name = project_name
            asset.folder_path = folder_path
            asset.object_name = object_name
            asset.full_path = full_path
            asset.updated_at = datetime.utcnow()
        else:
            # Create new
            asset = DimDQAsset(
                dq_asset_id=asset_id,
                project_name=project_name,
                folder_path=folder_path,
                object_name=object_name,
                full_path=full_path,
                asset_type=task.get("assetType"),
                connection_id=task.get("connectionId"),
                connection_name=task.get("connectionName"),
                connection_type=task.get("connectionType"),
                created_by=task.get("createdBy"),
                created_at=self._parse_timestamp(task.get("createdAt"))
            )
            self.db.add(asset)

        self.db.commit()
        return asset

    async def _sync_profiling_task(self, task: Dict[str, Any], dq_asset_id: str) -> DimProfilingTask:
        """Sync Profiling Task dimension."""
        task_id = task.get("id") or task.get("taskId")

        # Check if task exists
        prof_task = self.db.query(DimProfilingTask).filter_by(profiling_task_id=task_id).first()

        if prof_task:
            # Update existing
            prof_task.profiling_name = task.get("name", prof_task.profiling_name)
            prof_task.profiling_type = task.get("type")
            prof_task.is_active = 1
            prof_task.updated_at = datetime.utcnow()
        else:
            # Create new
            prof_task = DimProfilingTask(
                profiling_task_id=task_id,
                dq_asset_id=dq_asset_id,
                profiling_name=task.get("name", "Unknown"),
                profiling_type=task.get("type"),
                created_by=task.get("createdBy"),
                created_at=self._parse_timestamp(task.get("createdAt")),
                is_active=1
            )
            self.db.add(prof_task)

        self.db.commit()
        return prof_task

    async def _process_profiling_run(
        self,
        run: Dict[str, Any],
        task_id: str,
        dq_asset_id: str
    ) -> Optional[datetime]:
        """Process a profiling run and its results."""
        run_id = run.get("id") or run.get("runId")

        # Parse run timestamps
        run_start_time = self._parse_timestamp(run.get("startTime") or run.get("runStartTime"))
        run_end_time = self._parse_timestamp(run.get("endTime") or run.get("runEndTime"))

        # Sync run dimension
        prof_run = self.db.query(DimProfilingRun).filter_by(profiling_run_id=run_id).first()

        if not prof_run:
            prof_run = DimProfilingRun(
                profiling_run_id=run_id,
                profiling_task_id=task_id,
                run_status=run.get("status", "SUCCESS"),
                run_start_time=run_start_time,
                run_end_time=run_end_time,
                run_type=run.get("type", "SCHEDULED"),
                row_count=run.get("rowCount"),
                error_message=run.get("errorMessage")
            )
            self.db.add(prof_run)
            self.db.commit()

        # Fetch profiling results
        results = await self.profiling_service.get_profiling_results(run_id, task_id)

        # Fetch column statistics
        column_stats = await self.profiling_service.get_column_statistics(run_id, task_id=task_id)

        # Process and store results
        await self._store_profiling_results(
            run_id=run_id,
            task_id=task_id,
            dq_asset_id=dq_asset_id,
            run_timestamp=run_start_time or datetime.utcnow(),
            results=results,
            column_stats=column_stats
        )

        return run_start_time

    async def _store_profiling_results(
        self,
        run_id: str,
        task_id: str,
        dq_asset_id: str,
        run_timestamp: datetime,
        results: Dict[str, Any],
        column_stats: List[Dict[str, Any]]
    ):
        """Store profiling results in fact table."""
        # Get or create time dimension
        time_dim = self._get_or_create_time_dimension(run_timestamp.date())

        # Store table-level metrics
        table_metrics = results.get("tableMetrics") or results.get("summary") or {}

        for metric_name, metric_value in table_metrics.items():
            await self._upsert_profiling_result(
                run_id=run_id,
                task_id=task_id,
                dq_asset_id=dq_asset_id,
                time_id=time_dim.time_id,
                column_name=None,
                metric_type=metric_name.upper(),
                metric_value=metric_value if isinstance(metric_value, (int, float)) else None,
                metric_value_text=str(metric_value) if not isinstance(metric_value, (int, float)) else None,
                row_count=table_metrics.get("rowCount"),
                run_timestamp=run_timestamp
            )

        # Store column-level metrics
        for col_stat in column_stats:
            column_name = col_stat.get("columnName") or col_stat.get("name")
            if not column_name:
                continue

            # Get or create column dimension
            column_dim = self._get_or_create_column(column_name, col_stat.get("dataType"), dq_asset_id)

            # Extract metrics
            metrics = col_stat.get("metrics") or col_stat.get("statistics") or col_stat

            for metric_name, metric_value in metrics.items():
                if metric_name in ["columnName", "name", "dataType"]:
                    continue

                await self._upsert_profiling_result(
                    run_id=run_id,
                    task_id=task_id,
                    dq_asset_id=dq_asset_id,
                    time_id=time_dim.time_id,
                    column_name=column_name,
                    column_id=column_dim.column_id,
                    metric_type=metric_name.upper(),
                    metric_value=metric_value if isinstance(metric_value, (int, float)) else None,
                    metric_value_text=str(metric_value) if not isinstance(metric_value, (int, float)) else None,
                    row_count=metrics.get("rowCount"),
                    run_timestamp=run_timestamp
                )

    async def _upsert_profiling_result(
        self,
        run_id: str,
        task_id: str,
        dq_asset_id: str,
        time_id: int,
        metric_type: str,
        run_timestamp: datetime,
        column_name: Optional[str] = None,
        column_id: Optional[int] = None,
        metric_value: Optional[float] = None,
        metric_value_text: Optional[str] = None,
        row_count: Optional[int] = None
    ):
        """Upsert profiling result (prevents duplicates)."""
        # Check if result already exists
        existing = self.db.query(FactProfilingResult).filter_by(
            profiling_run_id=run_id,
            column_name=column_name,
            metric_type=metric_type
        ).first()

        if existing:
            # Update existing
            existing.metric_value = metric_value
            existing.metric_value_text = metric_value_text
            existing.row_count = row_count
        else:
            # Insert new
            result = FactProfilingResult(
                profiling_run_id=run_id,
                profiling_task_id=task_id,
                dq_asset_id=dq_asset_id,
                column_id=column_id,
                time_id=time_id,
                column_name=column_name,
                metric_type=metric_type,
                metric_value=metric_value,
                metric_value_text=metric_value_text,
                row_count=row_count,
                run_timestamp=run_timestamp
            )
            self.db.add(result)
            self.stats["results_inserted"] += 1

        self.db.commit()

    def _get_or_create_time_dimension(self, run_date: date) -> DimTime:
        """Get or create time dimension record."""
        # Check if exists
        time_dim = self.db.query(DimTime).filter_by(date=datetime.combine(run_date, datetime.min.time())).first()

        if time_dim:
            return time_dim

        # Create new
        dt = datetime.combine(run_date, datetime.min.time())
        time_dim = DimTime(
            date=dt,
            year=dt.year,
            month=dt.month,
            day=dt.day,
            week=dt.isocalendar()[1],
            quarter=(dt.month - 1) // 3 + 1,
            day_of_week=dt.weekday(),
            day_name=dt.strftime("%A"),
            month_name=dt.strftime("%B"),
            is_weekend=1 if dt.weekday() >= 5 else 0
        )
        self.db.add(time_dim)
        self.db.commit()
        self.db.refresh(time_dim)

        return time_dim

    def _get_or_create_column(self, column_name: str, data_type: Optional[str], dq_asset_id: str) -> DimColumn:
        """Get or create column dimension record."""
        # Check if exists
        column = self.db.query(DimColumn).filter_by(
            column_name=column_name,
            dq_asset_id=dq_asset_id
        ).first()

        if column:
            return column

        # Create new
        column = DimColumn(
            column_name=column_name,
            data_type=data_type,
            dq_asset_id=dq_asset_id
        )
        self.db.add(column)
        self.db.commit()
        self.db.refresh(column)

        return column

    def _parse_timestamp(self, timestamp_str: Optional[str]) -> Optional[datetime]:
        """Parse timestamp string to datetime."""
        if not timestamp_str:
            return None

        try:
            # Try ISO format
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except Exception:
            try:
                # Try Unix timestamp
                return datetime.fromtimestamp(float(timestamp_str))
            except Exception:
                return None

    async def close(self):
        """Close all service connections."""
        await self.metadata_service.close()
        await self.profiling_service.close()
        await self.auth.close()
