from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..core.database import get_db
from ..core.connection_utils import get_active_org_id
from ..models import (
    DimProfilingTask, DimProfilingRun, FactProfilingResult, DimDQAsset,
    FactColumnPattern, FactColumnDataType, FactColumnValueFrequency,
    DimRuleMapplet, FactRuleInputMapping, FactRuleOutputMapping
)
from ..schemas import (
    ProfilingTaskResponse, ProfilingRunResponse, ProfilingResultResponse,
    ColumnPatternResponse, ColumnDataTypeResponse, ColumnValueFrequencyResponse
)

router = APIRouter(prefix="/profiling", tags=["Profiling Data"])


@router.get("/tasks", response_model=List[ProfilingTaskResponse])
def get_profiling_tasks(
    project_name: Optional[str] = None,
    created_by: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get profiling tasks with optional filtering."""
    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    query = db.query(DimProfilingTask)

    # Filter by org_id
    query = query.filter(DimProfilingTask.org_id == active_org_id)

    # Join with DimDQAsset for project filtering
    if project_name:
        query = query.join(DimDQAsset).filter(DimDQAsset.project_name.ilike(f"%{project_name}%"))

    if created_by:
        query = query.filter(DimProfilingTask.created_by.ilike(f"%{created_by}%"))

    query = query.filter(DimProfilingTask.is_active == 1)
    query = query.order_by(DimProfilingTask.created_at.desc())

    tasks = query.limit(limit).offset(offset).all()
    return tasks


@router.get("/tasks/{task_id}", response_model=ProfilingTaskResponse)
def get_profiling_task(task_id: str, db: Session = Depends(get_db)):
    """Get a specific profiling task."""
    task = db.query(DimProfilingTask).filter(DimProfilingTask.profiling_task_id == task_id).first()
    if not task:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profiling task not found")
    return task


@router.get("/runs", response_model=List[ProfilingRunResponse])
def get_profiling_runs(
    task_id: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get profiling runs with optional filtering."""
    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    query = db.query(DimProfilingRun)

    # Filter by org_id
    query = query.filter(DimProfilingRun.org_id == active_org_id)

    if task_id:
        query = query.filter(DimProfilingRun.profiling_task_id == task_id)

    if status:
        query = query.filter(DimProfilingRun.run_status == status)

    if date_from:
        query = query.filter(DimProfilingRun.run_start_time >= date_from)

    if date_to:
        query = query.filter(DimProfilingRun.run_start_time <= date_to)

    query = query.order_by(DimProfilingRun.run_start_time.desc())

    runs = query.limit(limit).offset(offset).all()
    return runs


@router.get("/runs/{run_id}", response_model=ProfilingRunResponse)
def get_profiling_run(run_id: str, db: Session = Depends(get_db)):
    """Get a specific profiling run."""
    run = db.query(DimProfilingRun).filter(DimProfilingRun.profiling_run_id == run_id).first()
    if not run:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profiling run not found")
    return run


@router.get("/results", response_model=List[ProfilingResultResponse])
def get_profiling_results(
    run_id: Optional[str] = None,
    task_id: Optional[str] = None,
    metric_type: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get profiling results with optional filtering."""
    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    query = db.query(FactProfilingResult)

    # Filter by org_id
    query = query.filter(FactProfilingResult.org_id == active_org_id)

    if run_id:
        query = query.filter(FactProfilingResult.profiling_run_id == run_id)

    if task_id:
        query = query.filter(FactProfilingResult.profiling_task_id == task_id)

    if metric_type:
        query = query.filter(FactProfilingResult.metric_type == metric_type)

    query = query.order_by(FactProfilingResult.run_timestamp.desc())

    results = query.limit(limit).offset(offset).all()
    return results


@router.get("/assets")
def get_dq_assets(
    project_name: Optional[str] = None,
    connection_type: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get DQ assets with optional filtering."""
    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    query = db.query(DimDQAsset)

    # Filter by org_id
    query = query.filter(DimDQAsset.org_id == active_org_id)

    if project_name:
        query = query.filter(DimDQAsset.project_name.ilike(f"%{project_name}%"))

    if connection_type:
        query = query.filter(DimDQAsset.connection_type.ilike(f"%{connection_type}%"))

    query = query.order_by(DimDQAsset.created_at.desc())

    assets = query.limit(limit).offset(offset).all()
    return assets


@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics."""
    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return {
            "total_profiling_tasks": 0,
            "total_profiling_runs": 0,
            "total_profiling_results": 0,
            "total_dq_assets": 0,
            "successful_runs": 0,
            "failed_runs": 0
        }

    total_tasks = db.query(DimProfilingTask).filter(
        DimProfilingTask.is_active == 1,
        DimProfilingTask.org_id == active_org_id
    ).count()
    total_runs = db.query(DimProfilingRun).filter(
        DimProfilingRun.org_id == active_org_id
    ).count()
    total_results = db.query(FactProfilingResult).filter(
        FactProfilingResult.org_id == active_org_id
    ).count()
    total_assets = db.query(DimDQAsset).filter(
        DimDQAsset.org_id == active_org_id
    ).count()

    # Recent runs
    recent_successful = db.query(DimProfilingRun).filter(
        DimProfilingRun.run_status == "SUCCESS",
        DimProfilingRun.org_id == active_org_id
    ).count()

    recent_failed = db.query(DimProfilingRun).filter(
        DimProfilingRun.run_status == "FAILED",
        DimProfilingRun.org_id == active_org_id
    ).count()

    return {
        "total_profiling_tasks": total_tasks,
        "total_profiling_runs": total_runs,
        "total_profiling_results": total_results,
        "total_dq_assets": total_assets,
        "successful_runs": recent_successful,
        "failed_runs": recent_failed
    }


@router.get("/tasks-summary")
def get_profiling_tasks_summary(
    project_name: Optional[str] = None,
    folder_name: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get profiling tasks summary with sync status, run counts, and dates."""
    from sqlalchemy import func, desc
    from ..models.application import SyncJobRun

    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    # Base query joining tasks with assets
    query = db.query(
        DimProfilingTask.profiling_task_id,
        DimProfilingTask.profiling_name.label('task_name'),
        DimProfilingTask.profiling_type.label('task_type'),
        DimProfilingTask.frs_id,
        DimProfilingTask.project_id,
        DimProfilingTask.project_display_name,
        DimProfilingTask.folder_path.label('folder_name'),
        DimProfilingTask.folder_id,
        DimProfilingTask.folder_display_name,
        DimDQAsset.object_name,
        DimProfilingTask.created_at.label('first_pulled'),
        DimProfilingTask.updated_at.label('last_synced'),
        DimDQAsset.project_name,
        func.count(func.distinct(DimProfilingRun.profiling_run_id)).label('run_count'),
        func.max(DimProfilingRun.run_start_time).label('last_run_time')
    ).join(
        DimDQAsset,
        DimProfilingTask.dq_asset_id == DimDQAsset.dq_asset_id
    ).outerjoin(
        DimProfilingRun,
        DimProfilingTask.profiling_task_id == DimProfilingRun.profiling_task_id
    )

    # Filter by org_id
    query = query.filter(DimProfilingTask.org_id == active_org_id)

    # Apply filters
    if project_name:
        query = query.filter(DimDQAsset.project_name.ilike(f"%{project_name}%"))

    if folder_name:
        query = query.filter(DimDQAsset.folder_path.ilike(f"%{folder_name}%"))

    if search:
        query = query.filter(DimProfilingTask.profiling_name.ilike(f"%{search}%"))

    query = query.filter(DimProfilingTask.is_active == 1)
    query = query.group_by(
        DimProfilingTask.profiling_task_id,
        DimProfilingTask.profiling_name,
        DimProfilingTask.profiling_type,
        DimProfilingTask.frs_id,
        DimProfilingTask.project_id,
        DimProfilingTask.project_display_name,
        DimProfilingTask.folder_path,
        DimProfilingTask.folder_id,
        DimProfilingTask.folder_display_name,
        DimDQAsset.object_name,
        DimProfilingTask.created_at,
        DimProfilingTask.updated_at,
        DimDQAsset.project_name
    )

    query = query.order_by(desc('last_synced'))

    results = query.all()

    # Get the most recent sync job for this org
    # Note: Some old sync jobs may have NULL org_id, so we also check for those
    latest_sync_with_org = db.query(SyncJobRun).filter(
        SyncJobRun.org_id == active_org_id,
        SyncJobRun.completed_at.isnot(None)
    ).order_by(desc(SyncJobRun.completed_at)).first()

    latest_sync_global = db.query(SyncJobRun).filter(
        SyncJobRun.completed_at.isnot(None)
    ).order_by(desc(SyncJobRun.completed_at)).first()

    # Use org-specific sync if available, otherwise fall back to global
    latest_sync = latest_sync_with_org if latest_sync_with_org else latest_sync_global

    # Determine sync status based on task's profiling runs, not the sync job status
    # Logic:
    # - If task has profiling runs (run_count > 0): It was successfully synced at some point → success
    # - If task has no profiling runs (run_count == 0): It was never synced or sync failed → pending
    # - Only show "failed" if there's a very recent failed sync job (within 1 hour) AND task has no runs
    tasks_with_status = []
    for result in results:
        # Tasks with profiling runs are considered successfully synced
        if result.run_count > 0:
            sync_status = 'success'
        else:
            # Task has no profiling runs
            # Check if there's a very recent failed sync (within last hour)
            if latest_sync and latest_sync.status == 'FAILED':
                from datetime import timedelta
                one_hour_ago = datetime.utcnow() - timedelta(hours=1)
                if latest_sync.completed_at and latest_sync.completed_at > one_hour_ago:
                    sync_status = 'failed'
                else:
                    sync_status = 'pending'
            elif latest_sync and latest_sync.status == 'RUNNING':
                sync_status = 'pending'
            else:
                sync_status = 'pending'

        tasks_with_status.append({
            'task_id': result.profiling_task_id,
            'task_name': result.task_name,  # Use aliased name from query
            'task_type': result.task_type,
            'object_name': result.object_name,
            'project_name': result.project_name,
            'project_id': result.project_id,  # frsProjectId from dim_profiling_task
            'project_display_name': result.project_display_name,
            'folder_name': result.folder_name,  # This is folder_path aliased as folder_name
            'folder_id': result.folder_id,  # frsFolderId from dim_profiling_task
            'folder_display_name': result.folder_display_name,
            'frs_id': result.frs_id,  # frsId from profile (the actual profile frsId field)
            'first_pulled': result.first_pulled,
            'last_synced': result.last_synced,
            'run_count': result.run_count or 0,
            'last_run_time': result.last_run_time,
            'sync_status': sync_status
        })

    return tasks_with_status


@router.get("/statistics/trends")
def get_statistics_trends(
    task_id: str,
    column_name: Optional[str] = None,
    metric_type: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get historical trend data for statistics across profiling runs."""
    from sqlalchemy import desc

    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    query = db.query(
        FactProfilingResult,
        DimProfilingRun.run_start_time,
        DimProfilingRun.run_key
    ).join(
        DimProfilingRun,
        FactProfilingResult.profiling_run_id == DimProfilingRun.profiling_run_id
    ).filter(
        FactProfilingResult.profiling_task_id == task_id,
        FactProfilingResult.org_id == active_org_id
    )

    if column_name:
        query = query.filter(FactProfilingResult.column_name == column_name)

    if metric_type:
        query = query.filter(FactProfilingResult.metric_type == metric_type)

    query = query.order_by(desc(DimProfilingRun.run_key))
    query = query.limit(limit)

    results = query.all()

    # Group by column and metric
    trends = {}
    for result, run_time, run_key in results:
        key = f"{result.column_name}_{result.metric_type}"
        if key not in trends:
            trends[key] = {
                'column_name': result.column_name,
                'metric_type': result.metric_type,
                'data_points': []
            }

        trends[key]['data_points'].append({
            'run_key': run_key,
            'run_time': run_time,
            'value': result.metric_value
        })

    return list(trends.values())


@router.get("/statistics/drift")
def get_statistics_drift(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Calculate drift (% change) between latest and previous profiling run."""
    from sqlalchemy import desc

    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return {'message': 'No active connection'}

    # Get two most recent runs
    runs = db.query(DimProfilingRun).filter(
        DimProfilingRun.profiling_task_id == task_id,
        DimProfilingRun.org_id == active_org_id
    ).order_by(desc(DimProfilingRun.run_key)).limit(2).all()

    if len(runs) < 2:
        return {'message': 'Not enough runs to calculate drift'}

    latest_run_id = runs[0].profiling_run_id
    previous_run_id = runs[1].profiling_run_id

    # Get results for both runs
    latest_results = db.query(FactProfilingResult).filter(
        FactProfilingResult.profiling_run_id == latest_run_id,
        FactProfilingResult.org_id == active_org_id
    ).all()

    previous_results = db.query(FactProfilingResult).filter(
        FactProfilingResult.profiling_run_id == previous_run_id,
        FactProfilingResult.org_id == active_org_id
    ).all()

    # Create lookup for previous results
    previous_lookup = {
        f"{r.column_name}_{r.metric_type}": r.metric_value
        for r in previous_results
    }

    # Calculate drift
    drift_data = []
    for result in latest_results:
        key = f"{result.column_name}_{result.metric_type}"
        previous_value = previous_lookup.get(key)

        if previous_value is not None and previous_value != 0:
            current_value = result.metric_value or 0
            drift_pct = ((current_value - previous_value) / previous_value) * 100

            drift_data.append({
                'column_name': result.column_name,
                'metric_type': result.metric_type,
                'previous_value': previous_value,
                'current_value': current_value,
                'drift_percent': round(drift_pct, 2),
                'drift_absolute': current_value - previous_value
            })

    return {
        'latest_run': latest_run_id,
        'previous_run': previous_run_id,
        'latest_run_time': runs[0].run_start_time,
        'previous_run_time': runs[1].run_start_time,
        'drift_data': drift_data
    }


@router.get("/patterns", response_model=List[ColumnPatternResponse])
def get_column_patterns(
    run_id: Optional[str] = None,
    task_id: Optional[str] = None,
    column_id_external: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get column pattern data with satisfaction counts."""
    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    query = db.query(FactColumnPattern)

    # Filter by org_id
    query = query.filter(FactColumnPattern.org_id == active_org_id)

    if run_id:
        query = query.filter(FactColumnPattern.profiling_run_id == run_id)

    if task_id:
        query = query.filter(FactColumnPattern.profiling_task_id == task_id)

    if column_id_external:
        query = query.filter(FactColumnPattern.column_id_external == column_id_external)

    query = query.order_by(FactColumnPattern.run_timestamp.desc())

    patterns = query.limit(limit).offset(offset).all()
    return patterns


@router.get("/datatypes", response_model=List[ColumnDataTypeResponse])
def get_column_datatypes(
    run_id: Optional[str] = None,
    task_id: Optional[str] = None,
    column_id_external: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get column data type information with frequencies."""
    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    query = db.query(FactColumnDataType)

    # Filter by org_id
    query = query.filter(FactColumnDataType.org_id == active_org_id)

    if run_id:
        query = query.filter(FactColumnDataType.profiling_run_id == run_id)

    if task_id:
        query = query.filter(FactColumnDataType.profiling_task_id == task_id)

    if column_id_external:
        query = query.filter(FactColumnDataType.column_id_external == column_id_external)

    if category:
        query = query.filter(FactColumnDataType.datatype_category == category)

    query = query.order_by(FactColumnDataType.run_timestamp.desc())

    datatypes = query.limit(limit).offset(offset).all()
    return datatypes


@router.get("/value-frequencies", response_model=List[ColumnValueFrequencyResponse])
def get_column_value_frequencies(
    run_id: Optional[str] = None,
    task_id: Optional[str] = None,
    column_id_external: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get top N most frequent values for columns."""
    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    query = db.query(FactColumnValueFrequency)

    # Filter by org_id
    query = query.filter(FactColumnValueFrequency.org_id == active_org_id)

    if run_id:
        query = query.filter(FactColumnValueFrequency.profiling_run_id == run_id)

    if task_id:
        query = query.filter(FactColumnValueFrequency.profiling_task_id == task_id)

    if column_id_external:
        query = query.filter(FactColumnValueFrequency.column_id_external == column_id_external)

    query = query.order_by(
        FactColumnValueFrequency.run_timestamp.desc(),
        FactColumnValueFrequency.value_rank.asc()
    )

    frequencies = query.limit(limit).offset(offset).all()
    return frequencies


@router.get("/rule-occurrences/{task_id}")
def get_rule_occurrences(
    task_id: str,
    db: Session = Depends(get_db)
):
    """
    Get rule occurrences for a profiling task.

    Returns rule occurrence details including thresholds, targets, and criticality
    linked to their output mappings.
    """
    from ..models import DimRuleOccurrence, FactRuleOutputMapping

    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    # Query rule occurrences with joined output mapping details
    occurrences = db.query(
        DimRuleOccurrence,
        FactRuleOutputMapping
    ).outerjoin(
        FactRuleOutputMapping,
        DimRuleOccurrence.mapplet_column_id == FactRuleOutputMapping.mapping_id
    ).filter(
        DimRuleOccurrence.org_id == active_org_id,
        DimRuleOccurrence.profiling_task_id == task_id
    ).all()

    result = []
    for occurrence, output_mapping in occurrences:
        result.append({
            "occurrence_id": occurrence.occurrence_id,
            "name": occurrence.name,
            "description": occurrence.description,
            "rule_frs_id": occurrence.rule_frs_id,
            "rule_mapplet_id": occurrence.rule_mapplet_id,
            "mapplet_column_id": occurrence.mapplet_column_id,
            "threshold": occurrence.threshold,
            "target": occurrence.target,
            "criticality": occurrence.criticality,
            "type": occurrence.type,
            "frequency": occurrence.frequency,
            "measuring_method": occurrence.measuring_method,
            "status": occurrence.status,
            # Include output mapping details if available
            "output_column_name": output_mapping.out_field_name if output_mapping else None,
            "output_column_key": output_mapping.column_key if output_mapping else None,
            "output_datatype": output_mapping.datatype if output_mapping else None,
        })

    return result


@router.get("/runs/{run_id}/rule-statistics")
def get_rule_statistics_for_run(
    run_id: str,
    db: Session = Depends(get_db)
):
    """
    Get rule statistics for a specific profiling run.

    Returns MAPPLETFIELD statistics with complete rule information including:
    - Rule name, type (document type), dimension, exception flag
    - Input mappings (source column -> rule input port)
    - Output mappings (rule output port -> column_key -> statistics)
    - All metrics for each output column

    Example cURL to fetch rule metadata from FRS API:
    ```
    curl -X GET "https://na1.dm-us.informaticacloud.com/frs/api/v1/Documents?$filter=id eq 'hdcKuZ8k4qYhI6d6RN60iG' or id eq '2hzPQevNLuHj9BmWBUjNMJ'" \
      -H "IDS-SESSION-ID: your_session_token" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json"
    ```
    """
    from sqlalchemy import func

    # Get active org_id
    active_org_id = get_active_org_id(db)
    if not active_org_id:
        return []

    # Get all rules that have output mappings for this run
    # Use FactRuleOutputMapping to find which rules were executed in this run
    rule_ids_in_run = db.query(FactRuleOutputMapping.rule_mapplet_id).filter(
        FactRuleOutputMapping.profiling_run_id == run_id
    ).distinct().all()

    rule_ids = [r[0] for r in rule_ids_in_run]

    if not rule_ids:
        return []

    # Get the rule metadata
    rules_query = db.query(DimRuleMapplet).filter(
        DimRuleMapplet.org_id == active_org_id,
        DimRuleMapplet.rule_mapplet_id.in_(rule_ids)
    ).all()

    result = []
    for rule in rules_query:
        # Get input mappings
        input_mappings = db.query(FactRuleInputMapping).filter(
            FactRuleInputMapping.rule_mapplet_id == rule.rule_mapplet_id,
            FactRuleInputMapping.profiling_run_id == run_id
        ).all()

        # Get output mappings with statistics
        output_mappings_query = db.query(
            FactRuleOutputMapping.mapping_id,
            FactRuleOutputMapping.out_field_name,
            FactRuleOutputMapping.column_key,
            FactRuleOutputMapping.datatype,
            func.count(FactProfilingResult.result_id).label('metric_count')
        ).outerjoin(
            FactProfilingResult,
            FactRuleOutputMapping.mapping_id == FactProfilingResult.rule_output_mapping_id
        ).filter(
            FactRuleOutputMapping.rule_mapplet_id == rule.rule_mapplet_id,
            FactRuleOutputMapping.profiling_run_id == run_id
        ).group_by(
            FactRuleOutputMapping.mapping_id,
            FactRuleOutputMapping.out_field_name,
            FactRuleOutputMapping.column_key,
            FactRuleOutputMapping.datatype
        ).all()

        # Get statistics for each output mapping
        output_mappings = []
        for mapping_id, out_field_name, column_key, datatype, metric_count in output_mappings_query:
            # Get actual statistics
            stats = db.query(FactProfilingResult).filter(
                FactProfilingResult.rule_output_mapping_id == mapping_id,
                FactProfilingResult.profiling_run_id == run_id
            ).all()

            metrics = {}
            for stat in stats:
                metrics[stat.metric_type] = stat.metric_value

            output_mappings.append({
                "mapping_id": mapping_id,
                "out_field_name": out_field_name,
                "column_key": column_key,
                "datatype": datatype,
                "metric_count": metric_count,
                "metrics": metrics
            })

        result.append({
            "rule_mapplet_id": rule.rule_mapplet_id,
            "frs_id": rule.frs_id,
            "name": rule.name,
            "description": rule.description,
            "rule_type": rule.rule_type,  # Document type: RULE_SPECIFICATION, VERIFIER, CLEANSE, DMAPPLET
            "dimension": rule.dimension,
            "is_exception": rule.is_exception,
            "input_mappings": [
                {
                    "data_source_field_name": inp.data_source_field_name,
                    "in_field_name": inp.in_field_name,
                    "precision": inp.data_source_field_precision,
                    "scale": inp.data_source_field_scale
                }
                for inp in input_mappings
            ],
            "output_mappings": output_mappings
        })

    return result
