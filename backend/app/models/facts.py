from sqlalchemy import Column, String, Integer, DateTime, Float, BigInteger, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class FactProfilingResult(Base):
    """
    Fact table for Profiling Results.
    Stores metric values from profiling runs at the column level.
    This is the central fact table for BI analysis.
    Enhanced to support both data source fields and rule/mapplet outputs.
    """
    __tablename__ = "fact_profiling_result"

    result_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    profiling_run_id = Column(String(255), ForeignKey("dim_profiling_run.profiling_run_id"),
                             nullable=False, index=True)
    profiling_task_id = Column(String(255), ForeignKey("dim_profiling_task.profiling_task_id"),
                               nullable=False, index=True)

    # Legacy FKs (to be deprecated)
    dq_asset_id = Column(String(255), ForeignKey("dim_dq_asset.dq_asset_id"),
                        nullable=True, index=True)
    column_id = Column(Integer, ForeignKey("dim_column.column_id"), nullable=True, index=True)
    time_id = Column(Integer, ForeignKey("dim_time.time_id"), nullable=True, index=True)

    # Column Reference (supports both data source and rule/mapplet fields)
    column_key = Column(Integer, nullable=True, index=True,
                       comment="Column key from IDMC (universal identifier)")
    column_name = Column(String(255), nullable=True, index=True,
                        comment="Denormalized for query performance")
    column_type = Column(String(100), nullable=True, index=True,
                        comment="DATASOURCEFIELD or MAPPLETFIELD")
    column_id_external = Column(String(255), nullable=True,
                               comment="External column ID from IDMC")

    # Link to source/rule dimensions (NEW)
    data_source_field_id = Column(String(255), ForeignKey("dim_data_source_field.field_id"),
                                  nullable=True, index=True,
                                  comment="FK to dim_data_source_field if DATASOURCEFIELD")
    rule_output_mapping_id = Column(String(255), ForeignKey("fact_rule_output_mapping.mapping_id"),
                                    nullable=True, index=True,
                                    comment="FK to fact_rule_output_mapping if MAPPLETFIELD")

    # Metrics
    metric_type = Column(String(100), nullable=False, index=True,
                        comment="Type: NULL_COUNT, DISTINCT_COUNT, MIN, MAX, AVG, etc.")
    metric_value = Column(Float, nullable=True, comment="Numeric value of the metric")
    metric_value_text = Column(String(500), nullable=True, comment="Text value for non-numeric metrics")

    # Additional context
    row_count = Column(BigInteger, nullable=True, comment="Total row count for context")
    run_timestamp = Column(DateTime, nullable=False, index=True, comment="When this result was captured")

    # Data Types
    documented_data_type = Column(String(100), nullable=True, comment="Documented data type")
    inferred_data_type = Column(String(100), nullable=True, comment="Inferred data type")
    inferred_patterns = Column(Text, nullable=True, comment="JSON array of inferred patterns")

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profiling_run = relationship("DimProfilingRun", back_populates="profiling_results")
    profiling_task = relationship("DimProfilingTask", back_populates="profiling_results")
    dq_asset = relationship("DimDQAsset", back_populates="profiling_results")
    column = relationship("DimColumn", back_populates="profiling_results")
    time = relationship("DimTime", back_populates="profiling_results")
    data_source_field = relationship("DimDataSourceField",
                                    foreign_keys=[data_source_field_id],
                                    back_populates="profiling_results")
    rule_output_mapping = relationship("FactRuleOutputMapping",
                                      foreign_keys=[rule_output_mapping_id],
                                      back_populates="profiling_results")

    # Composite unique constraint to prevent duplicates
    # For MAPPLETFIELD: Use column_key (unique per output)
    # For DATASOURCEFIELD: Use column_name (column_key can be null)
    # Note: Multiple MAPPLETFIELD outputs can have the same column_name
    __table_args__ = (
        Index('idx_result_run_column_metric', 'profiling_run_id', 'column_key', 'column_name', 'metric_type', 'column_type', unique=True),
        Index('idx_result_asset_time', 'dq_asset_id', 'time_id'),
        Index('idx_result_task_time', 'profiling_task_id', 'time_id'),
        Index('idx_result_run_time', 'profiling_run_id', 'run_timestamp'),
        Index('idx_result_column_key', 'column_key', 'profiling_run_id'),
        Index('idx_result_column_type', 'column_type', 'profiling_run_id'),
        Index('idx_result_ds_field', 'data_source_field_id'),
        Index('idx_result_rule_output', 'rule_output_mapping_id'),
    )


class FactAPILog(Base):
    """
    Fact table for API Logs.
    Tracks all API calls made to IDMC for auditing and debugging.
    """
    __tablename__ = "fact_api_log"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    endpoint = Column(String(500), nullable=False, index=True, comment="API endpoint called")
    http_method = Column(String(10), nullable=False, comment="GET, POST, PUT, DELETE, etc.")
    request_payload = Column(Text, nullable=True, comment="Request body (JSON)")
    response_payload = Column(Text, nullable=True, comment="Response body (JSON)")
    status_code = Column(Integer, nullable=True, index=True, comment="HTTP status code")
    duration_ms = Column(Integer, nullable=True, comment="Request duration in milliseconds")
    error_message = Column(Text, nullable=True, comment="Error message if request failed")

    # Optional context
    profiling_task_id = Column(String(255), ForeignKey("dim_profiling_task.profiling_task_id"),
                               nullable=True, index=True)
    profiling_run_id = Column(String(255), ForeignKey("dim_profiling_run.profiling_run_id"),
                             nullable=True, index=True)
    sync_job_run_id = Column(Integer, nullable=True, index=True,
                            comment="Link to sync job run for troubleshooting")

    # Relationships
    profiling_task = relationship("DimProfilingTask")
    profiling_run = relationship("DimProfilingRun")

    __table_args__ = (
        Index('idx_log_timestamp_endpoint', 'timestamp', 'endpoint'),
        Index('idx_log_status', 'status_code', 'timestamp'),
        Index('idx_log_task', 'profiling_task_id', 'timestamp'),
    )
