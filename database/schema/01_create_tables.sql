-- IDMC Profiling Extractor Database Schema
-- PostgreSQL Star Schema for BI Reporting

-- ==============================================
-- APPLICATION TABLES
-- ==============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- IDMC Connections table
CREATE TABLE IF NOT EXISTS idmc_connections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    username VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_test_at TIMESTAMP,
    last_test_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync Jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    connection_id INTEGER REFERENCES idmc_connections(id),
    schedule_type VARCHAR(50) NOT NULL,
    schedule_config TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_incremental BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    last_run_status VARCHAR(50),
    next_run_at TIMESTAMP,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_jobs_connection ON sync_jobs(connection_id);
CREATE INDEX idx_sync_jobs_schedule ON sync_jobs(schedule_type, is_active);

-- Sync Job Runs table
CREATE TABLE IF NOT EXISTS sync_job_runs (
    id SERIAL PRIMARY KEY,
    sync_job_id INTEGER REFERENCES sync_jobs(id),
    run_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    projects_processed INTEGER DEFAULT 0,
    folders_processed INTEGER DEFAULT 0,
    tasks_processed INTEGER DEFAULT 0,
    runs_processed INTEGER DEFAULT 0,
    results_inserted INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_message TEXT,
    execution_log TEXT
);

CREATE INDEX idx_sync_job_runs_job ON sync_job_runs(sync_job_id, started_at DESC);
CREATE INDEX idx_sync_job_runs_status ON sync_job_runs(status, started_at DESC);

-- ==============================================
-- STAR SCHEMA - DIMENSION TABLES
-- ==============================================

-- Dimension: Connections
CREATE TABLE IF NOT EXISTS dim_connection (
    connection_id VARCHAR(255) PRIMARY KEY,
    connection_name VARCHAR(255) NOT NULL,
    connection_type VARCHAR(100),
    description VARCHAR(1000),
    created_by VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_connection_name ON dim_connection(connection_name);
CREATE INDEX idx_dim_connection_type ON dim_connection(connection_type);
CREATE INDEX idx_dim_connection_created_by ON dim_connection(created_by);

-- Dimension: DQ Assets (CRITICAL for BI filtering)
CREATE TABLE IF NOT EXISTS dim_dq_asset (
    dq_asset_id VARCHAR(255) PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    folder_path VARCHAR(1000),
    object_name VARCHAR(255) NOT NULL,
    full_path VARCHAR(2000) UNIQUE NOT NULL,
    asset_type VARCHAR(100),
    connection_id VARCHAR(255) REFERENCES dim_connection(connection_id),
    connection_name VARCHAR(255),
    connection_type VARCHAR(100),
    created_by VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_asset_project ON dim_dq_asset(project_name);
CREATE INDEX idx_dim_asset_folder ON dim_dq_asset(folder_path);
CREATE INDEX idx_dim_asset_object ON dim_dq_asset(object_name);
CREATE INDEX idx_dim_asset_full_path ON dim_dq_asset(full_path);
CREATE INDEX idx_dim_asset_connection ON dim_dq_asset(connection_id, connection_type);
CREATE INDEX idx_dim_asset_created_by ON dim_dq_asset(created_by);
CREATE INDEX idx_dim_asset_created_at ON dim_dq_asset(created_at);
CREATE INDEX idx_dim_asset_proj_folder ON dim_dq_asset(project_name, folder_path);

-- Dimension: Profiling Tasks
CREATE TABLE IF NOT EXISTS dim_profiling_task (
    profiling_task_id VARCHAR(255) PRIMARY KEY,
    dq_asset_id VARCHAR(255) REFERENCES dim_dq_asset(dq_asset_id),
    profiling_name VARCHAR(255) NOT NULL,
    profiling_type VARCHAR(100),
    created_by VARCHAR(255),
    created_at TIMESTAMP,
    last_run_at TIMESTAMP,
    last_successful_run_timestamp TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_task_name ON dim_profiling_task(profiling_name);
CREATE INDEX idx_dim_task_created_by ON dim_profiling_task(created_by);
CREATE INDEX idx_dim_task_created_at ON dim_profiling_task(created_at);
CREATE INDEX idx_dim_task_last_run ON dim_profiling_task(last_run_at);
CREATE INDEX idx_dim_task_asset ON dim_profiling_task(dq_asset_id);
CREATE INDEX idx_dim_task_name_created ON dim_profiling_task(profiling_name, created_at);

-- Dimension: Profiling Runs
CREATE TABLE IF NOT EXISTS dim_profiling_run (
    profiling_run_id VARCHAR(255) PRIMARY KEY,
    profiling_task_id VARCHAR(255) REFERENCES dim_profiling_task(profiling_task_id),
    run_status VARCHAR(50),
    run_start_time TIMESTAMP,
    run_end_time TIMESTAMP,
    run_type VARCHAR(50),
    row_count BIGINT,
    error_message VARCHAR(2000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_run_task ON dim_profiling_run(profiling_task_id);
CREATE INDEX idx_dim_run_status ON dim_profiling_run(run_status);
CREATE INDEX idx_dim_run_start ON dim_profiling_run(run_start_time);
CREATE INDEX idx_dim_run_task_time ON dim_profiling_run(profiling_task_id, run_start_time);
CREATE INDEX idx_dim_run_status_time ON dim_profiling_run(run_status, run_start_time);

-- Dimension: Columns
CREATE TABLE IF NOT EXISTS dim_column (
    column_id SERIAL PRIMARY KEY,
    column_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(100),
    dq_asset_id VARCHAR(255) REFERENCES dim_dq_asset(dq_asset_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_column_name ON dim_column(column_name);
CREATE INDEX idx_dim_column_asset ON dim_column(dq_asset_id);
CREATE INDEX idx_dim_column_asset_name ON dim_column(dq_asset_id, column_name);

-- Dimension: Time
CREATE TABLE IF NOT EXISTS dim_time (
    time_id SERIAL PRIMARY KEY,
    date TIMESTAMP UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    week INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    month_name VARCHAR(20) NOT NULL,
    is_weekend INTEGER DEFAULT 0
);

CREATE INDEX idx_dim_time_date ON dim_time(date);
CREATE INDEX idx_dim_time_year_month ON dim_time(year, month);
CREATE INDEX idx_dim_time_year ON dim_time(year);

-- ==============================================
-- STAR SCHEMA - FACT TABLES
-- ==============================================

-- Fact: Profiling Results
CREATE TABLE IF NOT EXISTS fact_profiling_result (
    result_id BIGSERIAL PRIMARY KEY,
    profiling_run_id VARCHAR(255) REFERENCES dim_profiling_run(profiling_run_id),
    profiling_task_id VARCHAR(255) REFERENCES dim_profiling_task(profiling_task_id),
    dq_asset_id VARCHAR(255) REFERENCES dim_dq_asset(dq_asset_id),
    column_id INTEGER REFERENCES dim_column(column_id),
    time_id INTEGER REFERENCES dim_time(time_id),
    metric_type VARCHAR(100) NOT NULL,
    metric_value DOUBLE PRECISION,
    metric_value_text VARCHAR(500),
    row_count BIGINT,
    run_timestamp TIMESTAMP NOT NULL,
    column_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Critical unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_fact_result_unique ON fact_profiling_result(profiling_run_id, column_name, metric_type);

CREATE INDEX idx_fact_result_run ON fact_profiling_result(profiling_run_id);
CREATE INDEX idx_fact_result_task ON fact_profiling_result(profiling_task_id);
CREATE INDEX idx_fact_result_asset ON fact_profiling_result(dq_asset_id);
CREATE INDEX idx_fact_result_time ON fact_profiling_result(time_id);
CREATE INDEX idx_fact_result_metric ON fact_profiling_result(metric_type);
CREATE INDEX idx_fact_result_timestamp ON fact_profiling_result(run_timestamp);
CREATE INDEX idx_fact_result_asset_time ON fact_profiling_result(dq_asset_id, time_id);
CREATE INDEX idx_fact_result_task_time ON fact_profiling_result(profiling_task_id, time_id);
CREATE INDEX idx_fact_result_run_time ON fact_profiling_result(profiling_run_id, run_timestamp);

-- Fact: API Logs
CREATE TABLE IF NOT EXISTS fact_api_log (
    log_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    request_payload TEXT,
    response_payload TEXT,
    status_code INTEGER,
    duration_ms INTEGER,
    error_message TEXT,
    profiling_task_id VARCHAR(255) REFERENCES dim_profiling_task(profiling_task_id),
    profiling_run_id VARCHAR(255) REFERENCES dim_profiling_run(profiling_run_id),
    sync_job_run_id INTEGER REFERENCES sync_job_runs(id)
);

CREATE INDEX idx_fact_log_timestamp ON fact_api_log(timestamp);
CREATE INDEX idx_fact_log_endpoint ON fact_api_log(endpoint);
CREATE INDEX idx_fact_log_status ON fact_api_log(status_code);
CREATE INDEX idx_fact_log_task ON fact_api_log(profiling_task_id);
CREATE INDEX idx_fact_log_run ON fact_api_log(profiling_run_id);
CREATE INDEX idx_fact_log_timestamp_endpoint ON fact_api_log(timestamp, endpoint);
CREATE INDEX idx_fact_log_status_timestamp ON fact_api_log(status_code, timestamp);

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE dim_dq_asset IS 'Dimension table for Data Quality Assets - contains project/folder/object hierarchy';
COMMENT ON COLUMN dim_dq_asset.full_path IS 'Full hierarchical path (project/folder/object) - REQUIRED for BI filtering';
COMMENT ON TABLE dim_profiling_task IS 'Dimension table for Profiling Tasks - configured profiling jobs';
COMMENT ON COLUMN dim_profiling_task.last_successful_run_timestamp IS 'Timestamp for incremental extraction logic';
COMMENT ON TABLE fact_profiling_result IS 'Fact table for Profiling Results - central table for BI analysis';
COMMENT ON TABLE fact_api_log IS 'Fact table for API Logs - audit trail of all IDMC API calls';
