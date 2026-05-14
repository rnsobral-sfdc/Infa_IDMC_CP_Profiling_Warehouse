from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Dict, Any
import json
from ..models import FactAPILog


class APILoggingService:
    """
    Service for logging all API calls to IDMC.
    Provides comprehensive audit trail for troubleshooting and monitoring.
    """

    def __init__(self, db: Session):
        self.db = db

    async def log_api_call(
        self,
        endpoint: str,
        http_method: str,
        status_code: Optional[int] = None,
        request_payload: Optional[Dict[str, Any]] = None,
        response_payload: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[int] = None,
        error_message: Optional[str] = None,
        profiling_task_id: Optional[str] = None,
        profiling_run_id: Optional[str] = None,
        sync_job_run_id: Optional[int] = None
    ) -> FactAPILog:
        """
        Log an API call to the database.

        Args:
            endpoint: API endpoint URL
            http_method: HTTP method (GET, POST, etc.)
            status_code: HTTP response status code
            request_payload: Request body (will be serialized to JSON)
            response_payload: Response body (will be serialized to JSON)
            duration_ms: Request duration in milliseconds
            error_message: Error message if request failed
            profiling_task_id: Associated profiling task ID
            profiling_run_id: Associated profiling run ID
            sync_job_run_id: Associated sync job run ID

        Returns:
            Created FactAPILog instance
        """
        # Serialize payloads to JSON strings
        request_json = None
        if request_payload:
            try:
                request_json = json.dumps(request_payload, default=str)
                # Truncate if too large (keep first 10000 characters)
                if len(request_json) > 10000:
                    request_json = request_json[:10000] + "... [TRUNCATED]"
            except Exception:
                request_json = str(request_payload)[:10000]

        response_json = None
        if response_payload:
            try:
                response_json = json.dumps(response_payload, default=str)
                # Truncate if too large
                if len(response_json) > 50000:
                    response_json = response_json[:50000] + "... [TRUNCATED]"
            except Exception:
                response_json = str(response_payload)[:50000]

        # Create log entry
        log_entry = FactAPILog(
            timestamp=datetime.utcnow(),
            endpoint=endpoint[:500],  # Truncate long URLs
            http_method=http_method,
            request_payload=request_json,
            response_payload=response_json,
            status_code=status_code,
            duration_ms=duration_ms,
            error_message=error_message[:2000] if error_message else None,
            profiling_task_id=profiling_task_id,
            profiling_run_id=profiling_run_id,
            sync_job_run_id=sync_job_run_id
        )

        self.db.add(log_entry)
        self.db.commit()
        self.db.refresh(log_entry)

        return log_entry

    def get_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        endpoint_filter: Optional[str] = None,
        status_code_filter: Optional[int] = None,
        profiling_task_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> list[FactAPILog]:
        """
        Retrieve API logs with filtering.

        Args:
            limit: Maximum number of logs to return
            offset: Number of logs to skip
            endpoint_filter: Filter by endpoint (partial match)
            status_code_filter: Filter by HTTP status code
            profiling_task_id: Filter by profiling task ID
            date_from: Filter logs from this date
            date_to: Filter logs to this date

        Returns:
            List of FactAPILog instances
        """
        query = self.db.query(FactAPILog)

        if endpoint_filter:
            query = query.filter(FactAPILog.endpoint.ilike(f"%{endpoint_filter}%"))

        if status_code_filter:
            query = query.filter(FactAPILog.status_code == status_code_filter)

        if profiling_task_id:
            query = query.filter(FactAPILog.profiling_task_id == profiling_task_id)

        if date_from:
            query = query.filter(FactAPILog.timestamp >= date_from)

        if date_to:
            query = query.filter(FactAPILog.timestamp <= date_to)

        query = query.order_by(FactAPILog.timestamp.desc())
        query = query.limit(limit).offset(offset)

        return query.all()

    def get_log_count(
        self,
        endpoint_filter: Optional[str] = None,
        status_code_filter: Optional[int] = None,
        profiling_task_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> int:
        """Get total count of logs matching filters."""
        query = self.db.query(FactAPILog)

        if endpoint_filter:
            query = query.filter(FactAPILog.endpoint.ilike(f"%{endpoint_filter}%"))

        if status_code_filter:
            query = query.filter(FactAPILog.status_code == status_code_filter)

        if profiling_task_id:
            query = query.filter(FactAPILog.profiling_task_id == profiling_task_id)

        if date_from:
            query = query.filter(FactAPILog.timestamp >= date_from)

        if date_to:
            query = query.filter(FactAPILog.timestamp <= date_to)

        return query.count()

    def get_error_summary(self, hours: int = 24) -> Dict[str, Any]:
        """
        Get summary of API errors in the last N hours.

        Args:
            hours: Number of hours to look back

        Returns:
            Dictionary with error statistics
        """
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(hours=hours)

        query = self.db.query(FactAPILog).filter(
            FactAPILog.timestamp >= cutoff,
            FactAPILog.status_code >= 400
        )

        error_logs = query.all()

        # Group by status code
        status_counts = {}
        for log in error_logs:
            status = log.status_code or "Unknown"
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            "total_errors": len(error_logs),
            "time_range_hours": hours,
            "errors_by_status": status_counts,
            "recent_errors": [
                {
                    "timestamp": log.timestamp,
                    "endpoint": log.endpoint,
                    "status_code": log.status_code,
                    "error_message": log.error_message
                }
                for log in error_logs[:10]  # Last 10 errors
            ]
        }
