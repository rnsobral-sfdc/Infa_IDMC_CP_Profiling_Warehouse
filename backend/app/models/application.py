from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class User(Base):
    """Application users for authentication."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sync_jobs = relationship("SyncJob", back_populates="created_by_user")


class IDMCConnection(Base):
    """
    Stores IDMC connection credentials (encrypted).
    Multiple connections supported (one per org).
    """
    __tablename__ = "idmc_connections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    base_url = Column(String(500), nullable=False, comment="IDMC base URL (e.g., https://dm-us.informaticacloud.com)")
    org_id = Column(String(255), nullable=True, comment="IDMC Organization ID (auto-detected from login)")
    org_name = Column(String(500), nullable=True, comment="IDMC Organization Name")
    profiling_url = Column(String(500), nullable=True, comment="Auto-detected profiling URL (pod-based)")
    username = Column(String(255), nullable=False, comment="IDMC username")
    encrypted_password = Column(Text, nullable=False, comment="Encrypted IDMC password")
    is_active = Column(Boolean, default=True, comment="Active connection")
    last_test_at = Column(DateTime, nullable=True, comment="Last successful connection test")
    last_test_status = Column(String(50), nullable=True, comment="SUCCESS or FAILED")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sync_jobs = relationship("SyncJob", back_populates="connection")


class SyncJob(Base):
    """
    Scheduled synchronization jobs for extracting data from IDMC.
    """
    __tablename__ = "sync_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    connection_id = Column(Integer, ForeignKey("idmc_connections.id"), nullable=False)
    schedule_type = Column(String(50), nullable=False,
                          comment="HOURLY, DAILY, WEEKLY, MONTHLY, MANUAL")
    schedule_config = Column(Text, nullable=True, comment="JSON config for schedule (hour, day, etc.)")
    is_active = Column(Boolean, default=True)
    is_incremental = Column(Boolean, default=True,
                           comment="True for incremental (delta), False for full load")
    task_limit = Column(Integer, nullable=True,
                       comment="Limit number of tasks to import (NULL = all, 10, 100, etc.)")
    max_runs_per_task = Column(Integer, default=5,
                              comment="Max profiling runs per task: 1, 3, 10, or NULL for all")

    # Tracking
    last_run_at = Column(DateTime, nullable=True)
    last_run_status = Column(String(50), nullable=True, comment="SUCCESS, FAILED, RUNNING")
    next_run_at = Column(DateTime, nullable=True)

    # Audit
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    connection = relationship("IDMCConnection", back_populates="sync_jobs")
    created_by_user = relationship("User", back_populates="sync_jobs")
    runs = relationship("SyncJobRun", back_populates="sync_job", order_by="SyncJobRun.started_at.desc()")


class SyncJobRun(Base):
    """
    Individual execution instances of sync jobs.
    Tracks progress and results of each synchronization run.
    """
    __tablename__ = "sync_job_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(255), nullable=True, index=True, comment="Organization ID from IDMC")
    sync_job_id = Column(Integer, ForeignKey("sync_jobs.id"), nullable=False, index=True)
    run_type = Column(String(50), nullable=False, comment="SCHEDULED, MANUAL, FULL_LOAD")
    status = Column(String(50), nullable=False, index=True,
                   comment="RUNNING, SUCCESS, FAILED, PARTIAL_SUCCESS")

    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    # Statistics
    projects_processed = Column(Integer, default=0)
    folders_processed = Column(Integer, default=0)
    tasks_processed = Column(Integer, default=0)
    runs_processed = Column(Integer, default=0)
    results_inserted = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)

    # Details
    error_message = Column(Text, nullable=True)
    execution_log = Column(Text, nullable=True, comment="Detailed execution log")

    # Checkpoint for resume
    checkpoint_data = Column(Text, nullable=True, comment="JSON checkpoint data for resume")
    last_processed_profile_id = Column(String(255), nullable=True, comment="Last profile ID processed")
    stop_requested = Column(Integer, default=0, comment="1 if stop requested, 0 otherwise")

    # Relationships
    sync_job = relationship("SyncJob", back_populates="runs")
