from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..core.database import get_db
from ..models import FactAPILog
from ..schemas import APILogResponse

router = APIRouter(prefix="/api-logs", tags=["API Logs"])


@router.get("/", response_model=List[APILogResponse])
def get_api_logs(
    endpoint_filter: Optional[str] = None,
    status_code: Optional[int] = None,
    profiling_task_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get API logs with filtering."""
    query = db.query(FactAPILog)

    if endpoint_filter:
        query = query.filter(FactAPILog.endpoint.ilike(f"%{endpoint_filter}%"))

    if status_code:
        query = query.filter(FactAPILog.status_code == status_code)

    if profiling_task_id:
        query = query.filter(FactAPILog.profiling_task_id == profiling_task_id)

    if date_from:
        query = query.filter(FactAPILog.timestamp >= date_from)

    if date_to:
        query = query.filter(FactAPILog.timestamp <= date_to)

    query = query.order_by(FactAPILog.timestamp.desc())

    logs = query.limit(limit).offset(offset).all()
    return logs


@router.get("/{log_id}", response_model=APILogResponse)
def get_api_log(log_id: int, db: Session = Depends(get_db)):
    """Get a specific API log entry."""
    log = db.query(FactAPILog).filter(FactAPILog.log_id == log_id).first()
    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Log entry not found")
    return log


@router.get("/stats/summary")
def get_api_log_summary(hours: int = Query(24, le=168), db: Session = Depends(get_db)):
    """Get API log summary statistics."""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=hours)

    total_calls = db.query(FactAPILog).filter(FactAPILog.timestamp >= cutoff).count()

    successful_calls = db.query(FactAPILog).filter(
        FactAPILog.timestamp >= cutoff,
        FactAPILog.status_code < 400
    ).count()

    failed_calls = db.query(FactAPILog).filter(
        FactAPILog.timestamp >= cutoff,
        FactAPILog.status_code >= 400
    ).count()

    # Average duration
    avg_duration_result = db.query(
        db.func.avg(FactAPILog.duration_ms)
    ).filter(
        FactAPILog.timestamp >= cutoff,
        FactAPILog.duration_ms.isnot(None)
    ).scalar()

    avg_duration = int(avg_duration_result) if avg_duration_result else 0

    return {
        "time_range_hours": hours,
        "total_api_calls": total_calls,
        "successful_calls": successful_calls,
        "failed_calls": failed_calls,
        "average_duration_ms": avg_duration
    }
