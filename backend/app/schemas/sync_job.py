from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SyncJobCreate(BaseModel):
    name: str
    description: Optional[str] = None
    connection_id: int
    schedule_type: str  # HOURLY, DAILY, WEEKLY, MONTHLY, MANUAL
    schedule_config: Optional[str] = None  # JSON string
    is_incremental: bool = False  # Default to FULL sync
    task_limit: Optional[int] = None  # Limit number of tasks (NULL = all)
    max_runs_per_task: Optional[int] = Field(default=5)  # Max runs per task (1, 3, 5, 10, or NULL for all)


class SyncJobUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule_type: Optional[str] = None
    schedule_config: Optional[str] = None
    is_active: Optional[bool] = None
    is_incremental: Optional[bool] = None
    task_limit: Optional[int] = None
    max_runs_per_task: Optional[int] = None


class SyncJobResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    description: Optional[str] = None
    connection_id: int
    schedule_type: str
    schedule_config: Optional[str] = None
    is_active: bool
    is_incremental: bool
    task_limit: Optional[int] = None
    max_runs_per_task: Optional[int] = None
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    last_run_error_message: Optional[str] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SyncJobRunResponse(BaseModel):
    id: int
    sync_job_id: int
    run_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    duration_seconds: Optional[int]
    projects_processed: int
    folders_processed: int
    tasks_processed: int
    runs_processed: int
    results_inserted: int
    errors_count: int
    error_message: Optional[str]

    class Config:
        from_attributes = True
