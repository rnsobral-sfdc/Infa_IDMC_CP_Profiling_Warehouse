"""
Admin API endpoints for database management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from ..core.database import get_db, engine, Base
from ..models import (
    FactProfilingResult, FactColumnPattern, FactColumnDataType,
    FactColumnValueFrequency, FactRuleInputMapping, FactRuleOutputMapping,
    FactAPILog, DimDataSourceField, DimRuleMapplet, DimRuleOccurrence,
    DimProfilingRun, DimProfilingTask, DimDQAsset, DimColumn, DimTime,
    DimConnection, SyncJobRun, SyncJob, IDMCConnection
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/purge-data")
def purge_all_data(
    keep_connections: bool = True,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Purge all profiling data from the database.
    Keeps connection records by default.

    Args:
        keep_connections: If True, preserves IDMC connection records

    Returns:
        Dictionary with purge statistics
    """
    try:
        stats = {
            "fact_tables_purged": 0,
            "dimension_tables_purged": 0,
            "application_tables_purged": 0
        }

        # Delete in order: children before parents (FK constraints)
        # Use synchronize_session=False for better performance and to avoid issues

        # First: Application tables that depend on sync jobs
        stats["application_tables_purged"] += db.query(SyncJobRun).delete(synchronize_session=False)
        db.commit()

        # Second: Fact tables (all depend on dimension tables)
        stats["fact_tables_purged"] += db.query(FactAPILog).delete(synchronize_session=False)
        stats["fact_tables_purged"] += db.query(FactProfilingResult).delete(synchronize_session=False)
        stats["fact_tables_purged"] += db.query(FactColumnPattern).delete(synchronize_session=False)
        stats["fact_tables_purged"] += db.query(FactColumnDataType).delete(synchronize_session=False)
        stats["fact_tables_purged"] += db.query(FactColumnValueFrequency).delete(synchronize_session=False)
        stats["fact_tables_purged"] += db.query(FactRuleInputMapping).delete(synchronize_session=False)
        stats["fact_tables_purged"] += db.query(FactRuleOutputMapping).delete(synchronize_session=False)
        db.commit()

        # Third: Dimension tables that depend on other dimensions
        stats["dimension_tables_purged"] += db.query(DimDataSourceField).delete(synchronize_session=False)
        stats["dimension_tables_purged"] += db.query(DimColumn).delete(synchronize_session=False)
        stats["dimension_tables_purged"] += db.query(DimRuleOccurrence).delete(synchronize_session=False)
        stats["dimension_tables_purged"] += db.query(DimRuleMapplet).delete(synchronize_session=False)
        stats["dimension_tables_purged"] += db.query(DimProfilingRun).delete(synchronize_session=False)
        stats["dimension_tables_purged"] += db.query(DimConnection).delete(synchronize_session=False)
        stats["dimension_tables_purged"] += db.query(DimProfilingTask).delete(synchronize_session=False)
        stats["dimension_tables_purged"] += db.query(DimDQAsset).delete(synchronize_session=False)
        stats["dimension_tables_purged"] += db.query(DimTime).delete(synchronize_session=False)
        db.commit()

        # Fourth: Application tables (sync jobs)
        stats["application_tables_purged"] += db.query(SyncJob).delete(synchronize_session=False)
        db.commit()

        # Last: Optionally delete connection configs
        if not keep_connections:
            stats["application_tables_purged"] += db.query(IDMCConnection).delete(synchronize_session=False)
            db.commit()

        # Final commit
        db.commit()

        return {
            "success": True,
            "message": "Data purged successfully",
            "connections_preserved": keep_connections,
            "stats": stats
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to purge data: {str(e)}")


@router.post("/recreate-database")
def recreate_database() -> Dict[str, Any]:
    """
    Drop all tables and recreate from scratch.
    WARNING: This will delete ALL data including connections!

    Returns:
        Success message
    """
    try:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        return {
            "success": True,
            "message": "Database recreated successfully",
            "warning": "All data has been deleted"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to recreate database: {str(e)}")


@router.get("/stats")
def get_database_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get database statistics including row counts for all tables.

    Returns:
        Dictionary with table statistics
    """
    return {
        "fact_tables": {
            "profiling_results": db.query(FactProfilingResult).count(),
            "column_patterns": db.query(FactColumnPattern).count(),
            "column_datatypes": db.query(FactColumnDataType).count(),
            "value_frequencies": db.query(FactColumnValueFrequency).count(),
            "rule_input_mappings": db.query(FactRuleInputMapping).count(),
            "rule_output_mappings": db.query(FactRuleOutputMapping).count(),
            "api_logs": db.query(FactAPILog).count(),
        },
        "dimension_tables": {
            "data_source_fields": db.query(DimDataSourceField).count(),
            "rule_mapplets": db.query(DimRuleMapplet).count(),
            "rule_occurrences": db.query(DimRuleOccurrence).count(),
            "profiling_runs": db.query(DimProfilingRun).count(),
            "profiling_tasks": db.query(DimProfilingTask).count(),
            "dq_assets": db.query(DimDQAsset).count(),
            "columns": db.query(DimColumn).count(),
            "time": db.query(DimTime).count(),
            "connections": db.query(DimConnection).count(),
        },
        "application_tables": {
            "idmc_connections": db.query(IDMCConnection).count(),
            "sync_jobs": db.query(SyncJob).count(),
            "sync_job_runs": db.query(SyncJobRun).count(),
        }
    }
