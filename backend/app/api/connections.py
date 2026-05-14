from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..core.database import get_db
from ..core.security import credential_encryptor
from ..models import IDMCConnection
from ..schemas import IDMCConnectionCreate, IDMCConnectionUpdate, IDMCConnectionResponse, ConnectionTestResponse
from ..services.auth_service import IDMCAuthService

router = APIRouter(prefix="/connections", tags=["IDMC Connections"])


@router.post("/", response_model=IDMCConnectionResponse)
def create_connection(conn_data: IDMCConnectionCreate, db: Session = Depends(get_db)):
    """Create a new IDMC connection."""
    # Check if name exists
    existing = db.query(IDMCConnection).filter(IDMCConnection.name == conn_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Connection name already exists")

    # Encrypt password
    encrypted_password = credential_encryptor.encrypt(conn_data.password)

    # Create connection
    # Note: profiling_url will be auto-detected when the connection is tested
    connection = IDMCConnection(
        name=conn_data.name,
        base_url=conn_data.base_url,
        profiling_url=None,  # Will be set during connection test
        username=conn_data.username,
        encrypted_password=encrypted_password,
        is_active=True
    )

    db.add(connection)
    db.commit()
    db.refresh(connection)

    return connection


@router.get("/", response_model=list[IDMCConnectionResponse])
def list_connections(db: Session = Depends(get_db)):
    """List all IDMC connections."""
    connections = db.query(IDMCConnection).all()
    return connections


@router.get("/{connection_id}", response_model=IDMCConnectionResponse)
def get_connection(connection_id: int, db: Session = Depends(get_db)):
    """Get a specific connection."""
    connection = db.query(IDMCConnection).filter(IDMCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    return connection


@router.put("/{connection_id}", response_model=IDMCConnectionResponse)
def update_connection(connection_id: int, conn_data: IDMCConnectionUpdate, db: Session = Depends(get_db)):
    """Update an existing connection."""
    connection = db.query(IDMCConnection).filter(IDMCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Update fields
    if conn_data.name:
        connection.name = conn_data.name
    if conn_data.base_url:
        connection.base_url = conn_data.base_url
    if conn_data.profiling_url is not None:
        connection.profiling_url = conn_data.profiling_url
    if conn_data.username:
        connection.username = conn_data.username
    if conn_data.password:
        connection.encrypted_password = credential_encryptor.encrypt(conn_data.password)

    # If base_url or credentials changed, clear org info (will be re-detected on next test)
    if conn_data.base_url or conn_data.username or conn_data.password:
        connection.org_id = None
        connection.org_name = None
        connection.profiling_url = None
        connection.last_test_status = None

    connection.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(connection)

    return connection


@router.delete("/{connection_id}")
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    """Delete a connection."""
    connection = db.query(IDMCConnection).filter(IDMCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    db.delete(connection)
    db.commit()

    return {"message": "Connection deleted successfully"}


@router.post("/{connection_id}/test", response_model=ConnectionTestResponse)
async def test_connection(connection_id: int, db: Session = Depends(get_db)):
    """Test an IDMC connection."""
    connection = db.query(IDMCConnection).filter(IDMCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Decrypt password
    password = credential_encryptor.decrypt(connection.encrypted_password)

    # Create auth service and test connection
    auth_service = IDMCAuthService(
        base_url=connection.base_url,
        username=connection.username,
        password=password,
        profiling_url=connection.profiling_url
    )

    try:
        # First, login to get org info and profiling URL
        login_result = await auth_service.login()

        if not login_result.get("success"):
            connection.last_test_at = datetime.utcnow()
            connection.last_test_status = "FAILED"
            db.commit()
            return ConnectionTestResponse(
                success=False,
                message=login_result.get("error", "Authentication failed"),
                org_id=None,
                org_name=None,
                profiling_url=None,
                timestamp=datetime.utcnow()
            )

        # Store org info and auto-detected profiling URL
        connection.org_id = login_result.get("orgId")
        connection.org_name = login_result.get("orgName")
        detected_profiling_url = login_result.get("profilingUrl")

        # Use detected URL if we don't have one
        if detected_profiling_url and not connection.profiling_url:
            connection.profiling_url = detected_profiling_url

        # Update auth service with detected profiling URL
        if connection.profiling_url:
            auth_service.profiling_url = connection.profiling_url

        # Test profiling API access
        result = await auth_service.test_connection()

        # Auto-disconnect other active connections if this test succeeds
        disconnected_connection_names = []
        if result["success"]:
            # Find all other connections with SUCCESS status
            other_active_connections = db.query(IDMCConnection).filter(
                IDMCConnection.id != connection_id,
                IDMCConnection.last_test_status == "SUCCESS"
            ).all()

            # Disconnect them
            for other_conn in other_active_connections:
                other_conn.last_test_status = "DISCONNECTED"
                other_conn.last_test_at = datetime.utcnow()
                disconnected_connection_names.append(other_conn.name)

        # Update connection test status
        connection.last_test_at = datetime.utcnow()
        connection.last_test_status = "SUCCESS" if result["success"] else "FAILED"
        db.commit()

        return ConnectionTestResponse(
            success=result["success"],
            message=result["message"],
            org_id=connection.org_id,
            org_name=connection.org_name,
            profiling_url=connection.profiling_url,
            timestamp=result["timestamp"],
            disconnected_connections=disconnected_connection_names if disconnected_connection_names else None
        )

    except Exception as e:
        connection.last_test_at = datetime.utcnow()
        connection.last_test_status = "FAILED"
        db.commit()

        raise HTTPException(status_code=400, detail=str(e))

    finally:
        await auth_service.close()


@router.post("/{connection_id}/disconnect")
async def disconnect_connection(connection_id: int, db: Session = Depends(get_db)):
    """Disconnect from IDMC (clear session)."""
    connection = db.query(IDMCConnection).filter(IDMCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Update connection status to indicate it's disconnected
    connection.last_test_status = "DISCONNECTED"
    connection.last_test_at = datetime.utcnow()
    db.commit()

    return {"message": "Connection disconnected successfully", "connection_id": connection_id}


@router.post("/{connection_id}/purge")
def purge_connection_data(connection_id: int, db: Session = Depends(get_db)):
    """
    Purge all synced data for this connection's organization only.

    Deletes all profiling data (tasks, runs, results, etc.) that belongs
    to the org_id associated with this connection. Data from other
    organizations is preserved.

    If the connection has no org_id, all data in the database is deleted
    (backward compatibility for legacy connections).
    """
    connection = db.query(IDMCConnection).filter(IDMCConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    org_id = connection.org_id

    from ..models import (
        DimDQAsset, DimProfilingTask, DimProfilingRun, DimColumn, DimTime,
        DimDataSourceField, DimRuleMapplet, DimRuleOccurrence,
        FactProfilingResult, FactColumnPattern, FactColumnDataType, FactColumnValueFrequency,
        FactRuleInputMapping, FactRuleOutputMapping,
        FactAPILog, SyncJobRun, SyncJob
    )

    try:
        # If org_id exists, filter by it ONLY (do not include NULL to avoid deleting other orgs' data)
        if org_id:
            # Count records before deletion (filtered by specific org_id only)
            asset_count = db.query(DimDQAsset).filter(DimDQAsset.org_id == org_id).count()
            task_count = db.query(DimProfilingTask).filter(DimProfilingTask.org_id == org_id).count()
            run_count = db.query(DimProfilingRun).filter(DimProfilingRun.org_id == org_id).count()
            column_count = db.query(DimColumn).filter(DimColumn.org_id == org_id).count()
            field_count = db.query(DimDataSourceField).filter(DimDataSourceField.org_id == org_id).count()
            mapplet_count = db.query(DimRuleMapplet).filter(DimRuleMapplet.org_id == org_id).count()
            occurrence_count = db.query(DimRuleOccurrence).filter(DimRuleOccurrence.org_id == org_id).count()
            fact_count = db.query(FactProfilingResult).filter(FactProfilingResult.org_id == org_id).count()
            pattern_count = db.query(FactColumnPattern).filter(FactColumnPattern.org_id == org_id).count()
            datatype_count = db.query(FactColumnDataType).filter(FactColumnDataType.org_id == org_id).count()
            frequency_count = db.query(FactColumnValueFrequency).filter(FactColumnValueFrequency.org_id == org_id).count()
            rule_input_count = db.query(FactRuleInputMapping).filter(FactRuleInputMapping.org_id == org_id).count()
            rule_output_count = db.query(FactRuleOutputMapping).filter(FactRuleOutputMapping.org_id == org_id).count()
            api_log_count = db.query(FactAPILog).filter(FactAPILog.org_id == org_id).count()

            # Delete data for this specific org_id ONLY (in reverse order: facts first, then dimensions)
            # FACT TABLES (delete first to avoid foreign key constraints)
            deleted_api_logs = db.query(FactAPILog).filter(FactAPILog.org_id == org_id).delete(synchronize_session=False)
            deleted_rule_outputs = db.query(FactRuleOutputMapping).filter(FactRuleOutputMapping.org_id == org_id).delete(synchronize_session=False)
            deleted_rule_inputs = db.query(FactRuleInputMapping).filter(FactRuleInputMapping.org_id == org_id).delete(synchronize_session=False)
            deleted_frequencies = db.query(FactColumnValueFrequency).filter(FactColumnValueFrequency.org_id == org_id).delete(synchronize_session=False)
            deleted_datatypes = db.query(FactColumnDataType).filter(FactColumnDataType.org_id == org_id).delete(synchronize_session=False)
            deleted_patterns = db.query(FactColumnPattern).filter(FactColumnPattern.org_id == org_id).delete(synchronize_session=False)
            deleted_profiling_results = db.query(FactProfilingResult).filter(FactProfilingResult.org_id == org_id).delete(synchronize_session=False)

            # DIMENSION TABLES (delete after facts)
            deleted_occurrences = db.query(DimRuleOccurrence).filter(DimRuleOccurrence.org_id == org_id).delete(synchronize_session=False)
            deleted_mapplets = db.query(DimRuleMapplet).filter(DimRuleMapplet.org_id == org_id).delete(synchronize_session=False)
            deleted_fields = db.query(DimDataSourceField).filter(DimDataSourceField.org_id == org_id).delete(synchronize_session=False)
            deleted_runs = db.query(DimProfilingRun).filter(DimProfilingRun.org_id == org_id).delete(synchronize_session=False)
            deleted_tasks = db.query(DimProfilingTask).filter(DimProfilingTask.org_id == org_id).delete(synchronize_session=False)
            deleted_columns = db.query(DimColumn).filter(DimColumn.org_id == org_id).delete(synchronize_session=False)
            deleted_assets = db.query(DimDQAsset).filter(DimDQAsset.org_id == org_id).delete(synchronize_session=False)
        else:
            # No org_id: delete ALL data (backward compatibility for old data before migration)
            asset_count = db.query(DimDQAsset).count()
            task_count = db.query(DimProfilingTask).count()
            run_count = db.query(DimProfilingRun).count()
            column_count = db.query(DimColumn).count()
            field_count = db.query(DimDataSourceField).count()
            mapplet_count = db.query(DimRuleMapplet).count()
            occurrence_count = db.query(DimRuleOccurrence).count()
            fact_count = db.query(FactProfilingResult).count()
            pattern_count = db.query(FactColumnPattern).count()
            datatype_count = db.query(FactColumnDataType).count()
            frequency_count = db.query(FactColumnValueFrequency).count()
            rule_input_count = db.query(FactRuleInputMapping).count()
            rule_output_count = db.query(FactRuleOutputMapping).count()
            api_log_count = db.query(FactAPILog).count()

            # Delete ALL data (no org_id filter)
            # FACT TABLES (delete first to avoid foreign key constraints)
            deleted_api_logs = db.query(FactAPILog).delete(synchronize_session=False)
            deleted_rule_outputs = db.query(FactRuleOutputMapping).delete(synchronize_session=False)
            deleted_rule_inputs = db.query(FactRuleInputMapping).delete(synchronize_session=False)
            deleted_frequencies = db.query(FactColumnValueFrequency).delete(synchronize_session=False)
            deleted_datatypes = db.query(FactColumnDataType).delete(synchronize_session=False)
            deleted_patterns = db.query(FactColumnPattern).delete(synchronize_session=False)
            deleted_profiling_results = db.query(FactProfilingResult).delete(synchronize_session=False)

            # DIMENSION TABLES (delete after facts)
            deleted_occurrences = db.query(DimRuleOccurrence).delete(synchronize_session=False)
            deleted_mapplets = db.query(DimRuleMapplet).delete(synchronize_session=False)
            deleted_fields = db.query(DimDataSourceField).delete(synchronize_session=False)
            deleted_runs = db.query(DimProfilingRun).delete(synchronize_session=False)
            deleted_tasks = db.query(DimProfilingTask).delete(synchronize_session=False)
            deleted_columns = db.query(DimColumn).delete(synchronize_session=False)
            deleted_assets = db.query(DimDQAsset).delete(synchronize_session=False)

        # Note: DimTime is shared across orgs, so we don't delete it

        # Get sync job runs count for this connection's jobs
        sync_jobs = db.query(SyncJob).filter(SyncJob.connection_id == connection_id).all()
        sync_job_ids = [job.id for job in sync_jobs]
        sync_run_count = db.query(SyncJobRun).filter(
            SyncJobRun.sync_job_id.in_(sync_job_ids)
        ).count() if sync_job_ids else 0

        # Delete sync job runs for this connection
        deleted_sync_runs = 0
        if sync_job_ids:
            deleted_sync_runs = db.query(SyncJobRun).filter(
                SyncJobRun.sync_job_id.in_(sync_job_ids)
            ).delete(synchronize_session=False)

        db.commit()

        return {
            "message": f"All data purged successfully for {('organization: ' + (connection.org_name or org_id)) if org_id else 'all data'}",
            "org_id": org_id,
            "org_name": connection.org_name,
            "rows_deleted": {
                "dim_dq_asset": asset_count,
                "dim_profiling_task": task_count,
                "dim_profiling_run": run_count,
                "dim_column": column_count,
                "dim_data_source_field": field_count,
                "dim_rule_mapplet": mapplet_count,
                "dim_rule_occurrence": occurrence_count,
                "fact_profiling_result": fact_count,
                "fact_column_pattern": pattern_count,
                "fact_column_datatype": datatype_count,
                "fact_column_value_frequency": frequency_count,
                "fact_rule_input_mapping": rule_input_count,
                "fact_rule_output_mapping": rule_output_count,
                "fact_api_log": api_log_count,
                "sync_job_runs": sync_run_count
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to purge data: {str(e)}")
