"""
Models for profiling field details from runDetail API.
Separates data source fields from rule/mapplet fields for clarity.
Includes rule occurrences (dimensions, thresholds, scores).
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Index, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class DimDataSourceField(Base):
    """
    Dimension table for Data Source Fields (DATASOURCEFIELD).
    Represents columns from the source table/file being profiled.
    """
    __tablename__ = "dim_data_source_field"

    field_id = Column(String(255), primary_key=True, comment="ID from profiled_fields array")
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    profiling_task_id = Column(String(255), ForeignKey("dim_profiling_task.profiling_task_id"),
                               nullable=False, index=True)
    profiling_run_id = Column(String(255), ForeignKey("dim_profiling_run.profiling_run_id"),
                             nullable=False, index=True)

    # Field Identification
    column_key = Column(Integer, nullable=False, index=True, comment="Column key from IDMC")
    source_name = Column(String(255), nullable=False, index=True, comment="Source table/object name")
    field_name = Column(String(255), nullable=False, index=True, comment="Column name")

    # Data Type Info
    precision = Column(Integer, nullable=True, comment="Field precision/length")
    scale = Column(Integer, nullable=True, comment="Field scale (for decimals)")

    # Metadata
    is_deleted = Column(Boolean, default=False, comment="Soft delete flag")
    applied_by = Column(String(50), nullable=True, comment="USER or SYSTEM")
    field_type = Column(String(50), default='DATASOURCEFIELD', comment="Field type from API")

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profiling_task = relationship("DimProfilingTask")
    profiling_run = relationship("DimProfilingRun")
    profiling_results = relationship("FactProfilingResult",
                                    foreign_keys="[FactProfilingResult.data_source_field_id]",
                                    back_populates="data_source_field")

    __table_args__ = (
        Index('idx_dsf_source_name', 'source_name', 'field_name'),
        Index('idx_dsf_task_run', 'profiling_task_id', 'profiling_run_id'),
        Index('idx_dsf_column_key', 'column_key', 'profiling_run_id'),
    )


class DimRuleMapplet(Base):
    """
    Dimension table for Rules/Mapplets (MAPPLETFIELD).
    Represents data quality rules and mapplets applied during profiling.
    """
    __tablename__ = "dim_rule_mapplet"

    rule_mapplet_id = Column(String(255), primary_key=True, comment="ID from profiled_fields array")
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    profiling_task_id = Column(String(255), ForeignKey("dim_profiling_task.profiling_task_id"),
                               nullable=False, index=True)
    profiling_run_id = Column(String(255), ForeignKey("dim_profiling_run.profiling_run_id"),
                             nullable=False, index=True)

    # Rule Identification
    frs_id = Column(String(255), nullable=True, index=True, comment="FRS object ID for the rule")
    scorecard_id = Column(String(255), nullable=True, index=True, comment="Scorecard ID if applicable")
    assignment_identifier = Column(String(255), nullable=True, comment="Assignment identifier")

    # Rule Metadata (from FRS API)
    name = Column(String(500), nullable=True, index=True, comment="Rule/mapplet name from FRS")
    description = Column(String(2000), nullable=True, comment="Rule description from FRS")
    dimension = Column(String(100), nullable=True, comment="Data quality dimension (VALIDITY, CONSISTENCY, etc.)")
    is_exception = Column(Boolean, default=False, comment="Whether this rule generates exceptions")

    # Rule Metadata (from profiling API)
    rule_type = Column(String(50), nullable=True, index=True,
                      comment="RULE_SPECIFICATION, DATA_QUALITY_RULE, etc.")
    field_type = Column(String(50), default='MAPPLETFIELD', comment="Field type from API")

    # Metadata
    is_deleted = Column(Boolean, default=False, comment="Soft delete flag")
    applied_by = Column(String(50), nullable=True, comment="USER or SYSTEM")

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profiling_task = relationship("DimProfilingTask")
    profiling_run = relationship("DimProfilingRun")
    input_mappings = relationship("FactRuleInputMapping", back_populates="rule_mapplet")
    output_mappings = relationship("FactRuleOutputMapping", back_populates="rule_mapplet")
    rule_occurrence = relationship("DimRuleOccurrence", back_populates="rule_mapplet", uselist=False)

    __table_args__ = (
        Index('idx_rule_frs', 'frs_id'),
        Index('idx_rule_task_run', 'profiling_task_id', 'profiling_run_id'),
        Index('idx_rule_type', 'rule_type', 'profiling_run_id'),
    )


class FactRuleInputMapping(Base):
    """
    Fact table for Rule Input Mappings.
    Tracks which source columns are mapped to which rule input ports.
    """
    __tablename__ = "fact_rule_input_mapping"

    mapping_id = Column(String(255), primary_key=True, comment="ID from inputFieldMappings array")
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    rule_mapplet_id = Column(String(255), ForeignKey("dim_rule_mapplet.rule_mapplet_id"),
                            nullable=False, index=True)
    profiling_run_id = Column(String(255), ForeignKey("dim_profiling_run.profiling_run_id"),
                             nullable=False, index=True)

    # Source Field Binding
    data_source_field_name = Column(String(255), nullable=False, index=True,
                                   comment="Source column name")
    in_field_name = Column(String(255), nullable=False, comment="Rule input port name")

    # Source Field Metadata
    data_source_field_precision = Column(Integer, nullable=True,
                                        comment="Precision of source field")
    data_source_field_scale = Column(Integer, nullable=True,
                                    comment="Scale of source field")

    # Metadata
    is_deleted = Column(Boolean, default=False, comment="Soft delete flag")

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    rule_mapplet = relationship("DimRuleMapplet", back_populates="input_mappings")
    profiling_run = relationship("DimProfilingRun")

    __table_args__ = (
        Index('idx_input_rule', 'rule_mapplet_id'),
        Index('idx_input_source_field', 'data_source_field_name', 'profiling_run_id'),
        Index('idx_input_run', 'profiling_run_id', 'data_source_field_name'),
    )


class FactRuleOutputMapping(Base):
    """
    Fact table for Rule Output Mappings.
    Tracks rule output ports that are profiled (these have profiling results).
    """
    __tablename__ = "fact_rule_output_mapping"

    mapping_id = Column(String(255), primary_key=True, comment="ID from outputFieldMappings array")
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    rule_mapplet_id = Column(String(255), ForeignKey("dim_rule_mapplet.rule_mapplet_id"),
                            nullable=False, index=True)
    profiling_run_id = Column(String(255), ForeignKey("dim_profiling_run.profiling_run_id"),
                             nullable=False, index=True)

    # Output Field Details
    column_key = Column(Integer, nullable=False, index=True,
                       comment="Column key - used to join with profiling results")
    out_field_name = Column(String(255), nullable=False, index=True,
                           comment="Rule output port name")
    datatype = Column(String(100), nullable=True, comment="Output field data type")
    label = Column(String(255), nullable=True, comment="Output field label")

    # Metadata
    is_deleted = Column(Boolean, default=False, comment="Soft delete flag")

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    rule_mapplet = relationship("DimRuleMapplet", back_populates="output_mappings")
    profiling_run = relationship("DimProfilingRun")
    profiling_results = relationship("FactProfilingResult",
                                    foreign_keys="[FactProfilingResult.rule_output_mapping_id]",
                                    back_populates="rule_output_mapping")

    __table_args__ = (
        Index('idx_output_rule', 'rule_mapplet_id'),
        Index('idx_output_column_key', 'column_key', 'profiling_run_id'),
        Index('idx_output_run_field', 'profiling_run_id', 'out_field_name'),
    )


class DimRuleOccurrence(Base):
    """
    Dimension table for Rule Occurrences.
    Each rule can have one rule occurrence that defines dimensions, thresholds, and scores.
    Linked via mappletColumnId to rule output mappings.
    """
    __tablename__ = "dim_rule_occurrence"

    occurrence_id = Column(String(255), primary_key=True, comment="ID from ruleOccurrenceRM")
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    profiling_task_id = Column(String(255), ForeignKey("dim_profiling_task.profiling_task_id"),
                               nullable=False, index=True)

    # Link to rule
    rule_frs_id = Column(String(255), nullable=False, index=True,
                        comment="FRS ID of the associated rule")
    rule_mapplet_id = Column(String(255), ForeignKey("dim_rule_mapplet.rule_mapplet_id"),
                            nullable=True, index=True,
                            comment="FK to dim_rule_mapplet if rule exists")

    # Link to mapplet column (from outputFieldMappings)
    mapplet_column_id = Column(String(255),
                              ForeignKey("fact_rule_output_mapping.mapping_id"),
                              nullable=True, index=True,
                              comment="FK to fact_rule_output_mapping - the specific output column this rule measures")

    # Rule Occurrence Details
    name = Column(String(255), nullable=False, index=True,
                 comment="Rule occurrence name")
    description = Column(Text, nullable=True,
                        comment="Rule occurrence description")
    status = Column(String(50), nullable=True, index=True,
                   comment="Status: READ, WRITE, etc.")
    additional_metadata = Column(Text, nullable=True,
                                comment="Additional metadata (JSON)")

    # Thresholds and Targets
    threshold = Column(Float, nullable=True,
                      comment="Lower threshold value (minimum acceptable score) - e.g., 84.0")
    target = Column(Float, nullable=True,
                   comment="Higher target value (desired/goal score) - e.g., 95.0")

    # Measurement Settings
    measuring_method = Column(String(100), nullable=True,
                             comment="InformaticaCloudDataQuality, etc.")
    frequency = Column(String(50), nullable=True,
                      comment="Daily, Weekly, Monthly, etc.")
    criticality = Column(String(50), nullable=True, index=True,
                        comment="High, Medium, Low")
    type = Column(String(100), nullable=True, index=True,
                 comment="Uniqueness, Completeness, etc.")

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profiling_task = relationship("DimProfilingTask")
    rule_mapplet = relationship("DimRuleMapplet", back_populates="rule_occurrence")
    rule_output_mapping = relationship("FactRuleOutputMapping",
                                      foreign_keys=[mapplet_column_id],
                                      backref="rule_occurrences")

    __table_args__ = (
        Index('idx_occurrence_rule_frs', 'rule_frs_id'),
        Index('idx_occurrence_mapplet_col', 'mapplet_column_id'),
        Index('idx_occurrence_task', 'profiling_task_id', 'rule_frs_id'),
        Index('idx_occurrence_type_criticality', 'type', 'criticality'),
    )
