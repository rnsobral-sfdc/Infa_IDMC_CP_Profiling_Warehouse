from sqlalchemy import Column, String, Integer, DateTime, Float, BigInteger, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class FactColumnPattern(Base):
    """
    Fact table for Column Patterns.
    Stores inferred pattern data with satisfaction counts and percentages.
    """
    __tablename__ = "fact_column_pattern"

    pattern_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    run_key = Column(String(50), nullable=True, index=True, comment="Run key from IDMC")
    profiling_run_id = Column(String(255), ForeignKey("dim_profiling_run.profiling_run_id"),
                             nullable=False, index=True)
    profiling_task_id = Column(String(255), ForeignKey("dim_profiling_task.profiling_task_id"),
                               nullable=False, index=True)
    column_id_external = Column(String(255), nullable=False, index=True,
                               comment="External column ID from IDMC")
    column_name = Column(String(255), nullable=True, comment="Denormalized for query performance")

    # Pattern details
    domain_value = Column(String(500), nullable=True, comment="Pattern value (e.g., 'XXXX')")
    pattern_label = Column(String(500), nullable=True, comment="Pattern label (e.g., 'X(4)')")
    inferred_datatype = Column(String(500), nullable=True, comment="Inferred data type with percentage")

    # Satisfaction metrics
    satisfied_count = Column(BigInteger, nullable=True, comment="Number of rows matching this pattern")
    satisfied_count_percent = Column(Float, nullable=True, comment="Percentage of rows matching")
    total_rows = Column(BigInteger, nullable=True, comment="Total rows in the column")

    run_timestamp = Column(DateTime, nullable=False, index=True, comment="When this pattern was captured")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profiling_run = relationship("DimProfilingRun")
    profiling_task = relationship("DimProfilingTask")

    __table_args__ = (
        Index('idx_pattern_run_column', 'profiling_run_id', 'column_id_external'),
        Index('idx_pattern_task_time', 'profiling_task_id', 'run_timestamp'),
    )


class FactColumnDataType(Base):
    """
    Fact table for Column Data Types.
    Stores documented and inferred data types with frequency counts.
    """
    __tablename__ = "fact_column_datatype"

    datatype_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    run_key = Column(String(50), nullable=True, index=True, comment="Run key from IDMC")
    profiling_run_id = Column(String(255), ForeignKey("dim_profiling_run.profiling_run_id"),
                             nullable=False, index=True)
    profiling_task_id = Column(String(255), ForeignKey("dim_profiling_task.profiling_task_id"),
                               nullable=False, index=True)
    column_id_external = Column(String(255), nullable=False, index=True,
                               comment="External column ID from IDMC")
    column_name = Column(String(255), nullable=True, comment="Denormalized for query performance")

    # Data type details
    datatype_category = Column(String(50), nullable=False, index=True,
                              comment="'DOCUMENTED' or 'INFERRED'")
    inferred_datatype = Column(String(500), nullable=True, comment="Data type value")

    # Frequency metrics
    frequency = Column(BigInteger, nullable=True, comment="Number of rows with this data type")
    frequency_percent = Column(Float, nullable=True, comment="Percentage of rows")
    total_rows = Column(BigInteger, nullable=True, comment="Total rows in the column")

    run_timestamp = Column(DateTime, nullable=False, index=True, comment="When this data type was captured")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profiling_run = relationship("DimProfilingRun")
    profiling_task = relationship("DimProfilingTask")

    __table_args__ = (
        Index('idx_datatype_run_column', 'profiling_run_id', 'column_id_external'),
        Index('idx_datatype_task_time', 'profiling_task_id', 'run_timestamp'),
        Index('idx_datatype_category', 'datatype_category', 'profiling_run_id'),
    )


class FactColumnValueFrequency(Base):
    """
    Fact table for Column Value Frequencies.
    Stores top N most frequent values with counts and percentages.
    """
    __tablename__ = "fact_column_value_frequency"

    value_frequency_id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    run_key = Column(String(50), nullable=True, index=True, comment="Run key from IDMC")
    profiling_run_id = Column(String(255), ForeignKey("dim_profiling_run.profiling_run_id"),
                             nullable=False, index=True)
    profiling_task_id = Column(String(255), ForeignKey("dim_profiling_task.profiling_task_id"),
                               nullable=False, index=True)
    column_id_external = Column(String(255), nullable=False, index=True,
                               comment="External column ID from IDMC")
    column_name = Column(String(255), nullable=True, comment="Denormalized for query performance")

    # Value details
    column_value = Column(Text, nullable=True, comment="The actual column value")
    frequency = Column(BigInteger, nullable=True, comment="Number of occurrences")
    percent = Column(Float, nullable=True, comment="Percentage of total rows")
    is_outlier = Column(Integer, default=0, comment="1 if outlier, 0 otherwise")
    total_rows = Column(BigInteger, nullable=True, comment="Total rows in profiling run")
    row_identifier = Column(BigInteger, nullable=True, comment="Row identifier for this value occurrence")
    value_length = Column(Integer, nullable=True, comment="Length of the column value")

    # Ranking
    value_rank = Column(Integer, nullable=True, comment="Rank by frequency (1=most frequent)")

    run_timestamp = Column(DateTime, nullable=False, index=True, comment="When this frequency was captured")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profiling_run = relationship("DimProfilingRun")
    profiling_task = relationship("DimProfilingTask")

    __table_args__ = (
        Index('idx_value_freq_run_column', 'profiling_run_id', 'column_id_external'),
        Index('idx_value_freq_task_time', 'profiling_task_id', 'run_timestamp'),
        Index('idx_value_freq_rank', 'profiling_run_id', 'value_rank'),
    )
