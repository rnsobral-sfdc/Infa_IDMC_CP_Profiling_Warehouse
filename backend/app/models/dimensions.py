from sqlalchemy import Column, String, Integer, DateTime, BigInteger, Float, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class DimDQAsset(Base):
    """
    Dimension table for Data Quality Assets.
    Represents the profiled data objects (tables, files, etc.) with their hierarchical context.
    """
    __tablename__ = "dim_dq_asset"

    dq_asset_id = Column(String(255), primary_key=True, comment="Unique identifier for DQ asset")
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    project_name = Column(String(255), nullable=False, index=True, comment="Project name from IDMC")
    project_id = Column(String(255), nullable=True, index=True, comment="IDMC internal project ID")
    project_display_name = Column(String(255), nullable=True, index=True, comment="Project display name (English)")
    folder_path = Column(String(1000), nullable=True, index=True, comment="Folder path within project")
    folder_id = Column(String(255), nullable=True, index=True, comment="IDMC internal folder ID")
    folder_display_name = Column(String(255), nullable=True, comment="Folder display name (English)")
    object_name = Column(String(255), nullable=False, index=True, comment="Name of the profiled object")
    full_path = Column(String(2000), nullable=False, unique=True, index=True,
                      comment="Full hierarchical path: project/folder/object")
    asset_type = Column(String(100), nullable=True, comment="Type of asset (table, file, etc.)")
    connection_id = Column(String(255), ForeignKey("dim_connection.connection_id"), nullable=True)
    connection_name = Column(String(255), nullable=True, index=True)
    connection_type = Column(String(100), nullable=True, index=True)
    created_by = Column(String(255), nullable=True, index=True, comment="User who created the asset")
    created_at = Column(DateTime, nullable=True, index=True, comment="Asset creation timestamp")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    connection = relationship("DimConnection", back_populates="assets")
    profiling_results = relationship("FactProfilingResult", back_populates="dq_asset")

    # Composite index for common filter patterns
    __table_args__ = (
        Index('idx_asset_project_folder', 'project_name', 'folder_path'),
        Index('idx_asset_connection', 'connection_id', 'connection_type'),
    )


class DimProfilingTask(Base):
    """
    Dimension table for Profiling Tasks.
    Represents configured profiling jobs/tasks in IDMC.
    """
    __tablename__ = "dim_profiling_task"

    profiling_task_id = Column(String(255), primary_key=True, comment="Unique identifier for profiling task")
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    dq_asset_id = Column(String(255), ForeignKey("dim_dq_asset.dq_asset_id"), nullable=False)
    frs_id = Column(String(255), nullable=True, index=True, comment="FRS ID of the profile")
    project_name = Column(String(255), nullable=True, index=True, comment="Project name")
    project_id = Column(String(255), nullable=True, index=True, comment="FRS Project ID")
    project_display_name = Column(String(255), nullable=True, comment="Project display name")
    folder_path = Column(String(1000), nullable=True, index=True, comment="Folder path")
    folder_id = Column(String(255), nullable=True, comment="FRS Folder ID")
    folder_display_name = Column(String(255), nullable=True, comment="Folder display name")
    full_path = Column(String(2000), nullable=True, comment="Full path from Objects API")
    profiling_name = Column(String(255), nullable=False, index=True, comment="Name of the profiling task")
    profiling_type = Column(String(100), nullable=True, comment="Type of profiling (full, sample, etc.)")
    created_by = Column(String(255), nullable=True, index=True, comment="User who created the task")
    created_at = Column(DateTime, nullable=True, index=True, comment="Task creation timestamp")
    last_run_at = Column(DateTime, nullable=True, index=True, comment="Last successful run timestamp")
    last_successful_run_timestamp = Column(DateTime, nullable=True,
                                          comment="Timestamp for incremental extraction")
    is_active = Column(Integer, default=1, comment="1 if active, 0 if deleted/inactive")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    dq_asset = relationship("DimDQAsset")
    runs = relationship("DimProfilingRun", back_populates="profiling_task")
    profiling_results = relationship("FactProfilingResult", back_populates="profiling_task")

    __table_args__ = (
        Index('idx_task_name_created', 'profiling_name', 'created_at'),
        Index('idx_task_created_by', 'created_by', 'created_at'),
    )


class DimProfilingRun(Base):
    """
    Dimension table for Profiling Runs.
    Represents individual execution instances of profiling tasks.
    Enhanced with runDetail API metadata.
    """
    __tablename__ = "dim_profiling_run"

    profiling_run_id = Column(String(255), primary_key=True, comment="Unique identifier for profiling run")
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    profiling_task_id = Column(String(255), ForeignKey("dim_profiling_task.profiling_task_id"),
                               nullable=False, index=True)

    # Run Identification
    run_key = Column(String(50), nullable=True, index=True, comment="Run key/number from IDMC")
    job_id = Column(String(255), nullable=True, comment="Job ID from runDetail API")

    # Execution Details
    run_status = Column(String(50), nullable=True, index=True, comment="Status: COMPLETED, FAILED, RUNNING, etc.")
    run_detail_status = Column(String(50), nullable=True, comment="Detailed status from runDetail API")
    start_time = Column(BigInteger, nullable=True, comment="Start time in epoch milliseconds")
    end_time = Column(BigInteger, nullable=True, comment="End time in epoch milliseconds")
    execution_time_ms = Column(Integer, nullable=True, comment="Execution time in milliseconds")
    run_start_time = Column(DateTime, nullable=True, index=True, comment="Run start timestamp (converted)")
    run_end_time = Column(DateTime, nullable=True, comment="Run end timestamp (converted)")
    run_duration_seconds = Column(Integer, nullable=True, comment="Duration in seconds (calculated)")

    # Sampling Info
    sampling_type = Column(String(50), nullable=True, comment="ALL_ROWS, FIRST_N, RANDOM, etc.")
    sampling_rows = Column(Integer, nullable=True, comment="Number of rows sampled (-1 for all rows)")
    is_filter_enabled = Column(Boolean, default=False, comment="Whether filter is applied")
    filter_name = Column(String(255), nullable=True, comment="Name of filter if applied")

    # Row Counts
    rows_processed = Column(BigInteger, nullable=True, comment="Rows processed in this run")
    row_count = Column(BigInteger, nullable=True, comment="Total rows profiled (legacy field)")

    # Profiling Coverage (from runDetail API)
    number_of_ds_columns = Column(Integer, nullable=True, comment="Number of data source columns profiled")
    number_of_rules = Column(Integer, nullable=True, comment="Number of rules applied")
    number_of_mapplet_columns = Column(Integer, nullable=True, comment="Number of mapplet output columns profiled")
    number_of_columns = Column(Integer, nullable=True, comment="Total columns (DS + mapplet)")

    # Cost Tracking
    run_cost_mb = Column(Float, nullable=True, comment="Run cost in MB")

    # Detection Settings
    is_detect_outlier = Column(Boolean, default=True, comment="Whether outlier detection is enabled")

    # User Info
    created_by = Column(String(255), nullable=True, comment="User ID who created the run")
    created_by_name = Column(String(255), nullable=True, comment="User name who created the run")
    created_time = Column(BigInteger, nullable=True, comment="Creation time in epoch milliseconds")

    # Error Handling
    error_message = Column(String(2000), nullable=True, comment="Error message if failed")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profiling_task = relationship("DimProfilingTask", back_populates="runs")
    profiling_results = relationship("FactProfilingResult", back_populates="profiling_run")

    __table_args__ = (
        Index('idx_run_task_time', 'profiling_task_id', 'run_start_time'),
        Index('idx_run_status_time', 'run_status', 'run_start_time'),
        Index('idx_run_key', 'run_key', 'profiling_task_id'),
    )


class DimColumn(Base):
    """
    Dimension table for Columns.
    Represents columns within profiled data objects.
    """
    __tablename__ = "dim_column"

    column_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    column_name = Column(String(255), nullable=False, index=True, comment="Name of the column")
    data_type = Column(String(100), nullable=True, comment="Data type of the column")
    dq_asset_id = Column(String(255), ForeignKey("dim_dq_asset.dq_asset_id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    dq_asset = relationship("DimDQAsset")
    profiling_results = relationship("FactProfilingResult", back_populates="column")

    __table_args__ = (
        Index('idx_column_asset', 'dq_asset_id', 'column_name'),
    )


class DimTime(Base):
    """
    Dimension table for Time.
    Standard time dimension for BI reporting.
    """
    __tablename__ = "dim_time"

    time_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    date = Column(DateTime, nullable=False, unique=True, index=True)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    day = Column(Integer, nullable=False)
    week = Column(Integer, nullable=False)
    quarter = Column(Integer, nullable=False)
    day_of_week = Column(Integer, nullable=False)
    day_name = Column(String(20), nullable=False)
    month_name = Column(String(20), nullable=False)
    is_weekend = Column(Integer, default=0)

    # Relationships
    profiling_results = relationship("FactProfilingResult", back_populates="time")

    __table_args__ = (
        Index('idx_time_year_month', 'year', 'month'),
    )


class DimConnection(Base):
    """
    Dimension table for Connections.
    Represents data source connections in IDMC with full FRS document details.
    """
    __tablename__ = "dim_connection"

    connection_id = Column(String(255), primary_key=True, comment="Unique identifier for connection (FRS id)")
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    connection_name = Column(String(255), nullable=False, index=True, comment="Name of the connection")
    connection_type = Column(String(100), nullable=True, index=True,
                            comment="Type: Oracle, SQL Server, S3, etc.")
    connection_sub_type = Column(String(100), nullable=True, comment="Connection sub-type")
    connection_instance_name = Column(String(255), nullable=True, comment="Connection instance name")

    # FRS Document Details
    description = Column(String(1000), nullable=True, comment="Connection description")
    owner = Column(String(255), nullable=True, index=True, comment="Owner user ID")
    created_by = Column(String(255), nullable=True, index=True, comment="Creator user ID")
    last_updated_by = Column(String(255), nullable=True, comment="Last updater user ID")
    last_accessed_by = Column(String(255), nullable=True, comment="Last accessor user ID")

    # Timestamps (from FRS)
    created_time = Column(DateTime, nullable=True, index=True, comment="FRS creation timestamp")
    last_updated_time = Column(DateTime, nullable=True, comment="FRS last update timestamp")
    last_accessed_time = Column(DateTime, nullable=True, comment="FRS last access timestamp")
    expires_by = Column(DateTime, nullable=True, comment="Expiration timestamp")

    # Parent Hierarchy (Space > Project > Folder)
    space_id = Column(String(255), nullable=True, index=True, comment="Parent Space ID")
    space_name = Column(String(255), nullable=True, comment="Parent Space name")
    project_id = Column(String(255), nullable=True, index=True, comment="Parent Project ID")
    project_name = Column(String(255), nullable=True, comment="Parent Project name")
    folder_id = Column(String(255), nullable=True, comment="Parent Folder ID")
    folder_name = Column(String(255), nullable=True, comment="Parent Folder name")

    # Document Metadata
    document_type = Column(String(50), nullable=True, comment="SAAS_CONNECTION, etc.")
    document_state = Column(String(50), nullable=True, comment="COMPLETE, DRAFT, etc.")
    acl_rule = Column(String(50), nullable=True, comment="Access control rule: org, user, etc.")
    repo_handle = Column(String(50), nullable=True, comment="Repository handle")
    is_source_controlled = Column(Boolean, default=False, comment="Source control flag")

    created_at = Column(DateTime, default=datetime.utcnow, comment="Record creation in local DB")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="Record update in local DB")

    # Relationships
    assets = relationship("DimDQAsset", back_populates="connection")
