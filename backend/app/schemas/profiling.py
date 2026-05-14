from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProfilingTaskResponse(BaseModel):
    profiling_task_id: str
    dq_asset_id: str
    profiling_name: str
    profiling_type: Optional[str]
    created_by: Optional[str]
    created_at: Optional[datetime]
    last_run_at: Optional[datetime]
    is_active: int

    class Config:
        from_attributes = True


class ProfilingRunResponse(BaseModel):
    profiling_run_id: str
    profiling_task_id: str
    run_key: Optional[str] = None
    job_id: Optional[str] = None
    run_status: Optional[str] = None
    run_detail_status: Optional[str] = None
    run_start_time: Optional[datetime] = None
    run_end_time: Optional[datetime] = None
    run_duration_seconds: Optional[int] = None
    row_count: Optional[int] = None

    # Enhanced fields from runDetail API
    sampling_type: Optional[str] = None
    sampling_rows: Optional[int] = None
    is_filter_enabled: Optional[bool] = None
    filter_name: Optional[str] = None
    number_of_ds_columns: Optional[int] = None
    number_of_rules: Optional[int] = None
    number_of_mapplet_columns: Optional[int] = None
    number_of_columns: Optional[int] = None
    run_cost_mb: Optional[float] = None
    is_detect_outlier: Optional[bool] = None

    class Config:
        from_attributes = True


class ProfilingResultResponse(BaseModel):
    result_id: int
    profiling_run_id: str
    profiling_task_id: str
    dq_asset_id: str
    column_name: Optional[str]
    metric_type: str
    metric_value: Optional[float]
    metric_value_text: Optional[str]
    row_count: Optional[int]
    run_timestamp: datetime
    column_type: Optional[str]
    column_id_external: Optional[str]
    documented_data_type: Optional[str]
    inferred_data_type: Optional[str]
    inferred_patterns: Optional[str]

    class Config:
        from_attributes = True


class ColumnPatternResponse(BaseModel):
    pattern_id: int
    profiling_run_id: str
    profiling_task_id: str
    column_id_external: str
    column_name: Optional[str]
    domain_value: Optional[str]
    pattern_label: Optional[str]
    inferred_datatype: Optional[str]
    satisfied_count: Optional[int]
    satisfied_count_percent: Optional[float]
    total_rows: Optional[int]
    run_timestamp: datetime

    class Config:
        from_attributes = True


class ColumnDataTypeResponse(BaseModel):
    datatype_id: int
    profiling_run_id: str
    profiling_task_id: str
    column_id_external: str
    column_name: Optional[str]
    datatype_category: str
    inferred_datatype: Optional[str]
    frequency: Optional[int]
    frequency_percent: Optional[float]
    total_rows: Optional[int]
    run_timestamp: datetime

    class Config:
        from_attributes = True


class ColumnValueFrequencyResponse(BaseModel):
    value_frequency_id: int
    profiling_run_id: str
    profiling_task_id: str
    column_id_external: str
    column_name: Optional[str]
    column_value: Optional[str]
    frequency: Optional[int]
    percent: Optional[float]
    is_outlier: int
    value_rank: Optional[int]
    run_timestamp: datetime

    class Config:
        from_attributes = True
