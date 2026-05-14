from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class APILogResponse(BaseModel):
    log_id: int
    timestamp: datetime
    endpoint: str
    http_method: str
    request_payload: Optional[str]
    response_payload: Optional[str]
    status_code: Optional[int]
    duration_ms: Optional[int]
    error_message: Optional[str]
    profiling_task_id: Optional[str]
    profiling_run_id: Optional[str]

    class Config:
        from_attributes = True
