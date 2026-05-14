"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-01

Creates all base dimension and fact tables for the profiling star schema.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create dimension tables

    # dim_dq_asset
    op.create_table(
        'dim_dq_asset',
        sa.Column('dq_asset_id', sa.String(255), primary_key=True),
        sa.Column('project_name', sa.String(255), nullable=True),
        sa.Column('project_id', sa.String(255), nullable=True),
        sa.Column('project_display_name', sa.String(255), nullable=True),
        sa.Column('folder_path', sa.String(1000), nullable=True),
        sa.Column('folder_id', sa.String(255), nullable=True),
        sa.Column('folder_display_name', sa.String(255), nullable=True),
        sa.Column('object_name', sa.String(255), nullable=False),
        sa.Column('full_path', sa.String(2000), nullable=True),
        sa.Column('asset_type', sa.String(100), nullable=True),
        sa.Column('connection_type', sa.String(100), nullable=True),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_dq_asset_name', 'dim_dq_asset', ['object_name'])
    op.create_index('idx_dq_asset_path', 'dim_dq_asset', ['full_path'])

    # dim_profiling_task
    op.create_table(
        'dim_profiling_task',
        sa.Column('profiling_task_id', sa.String(255), primary_key=True),
        sa.Column('dq_asset_id', sa.String(255), sa.ForeignKey('dim_dq_asset.dq_asset_id'), nullable=False),
        sa.Column('profiling_name', sa.String(500), nullable=True),
        sa.Column('profiling_type', sa.String(100), nullable=True),
        sa.Column('frs_id', sa.String(255), nullable=True),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=True),
        sa.Column('is_active', sa.Integer, default=1),
    )
    op.create_index('idx_profiling_task_asset', 'dim_profiling_task', ['dq_asset_id'])

    # dim_profiling_run
    op.create_table(
        'dim_profiling_run',
        sa.Column('profiling_run_id', sa.String(255), primary_key=True),
        sa.Column('profiling_task_id', sa.String(255), sa.ForeignKey('dim_profiling_task.profiling_task_id'), nullable=False),
        sa.Column('run_key', sa.String(50), nullable=True),
        sa.Column('run_status', sa.String(50), nullable=True),
        sa.Column('run_start_time', sa.DateTime, nullable=True),
        sa.Column('run_end_time', sa.DateTime, nullable=True),
        sa.Column('run_duration_seconds', sa.Integer, nullable=True),
        sa.Column('run_type', sa.String(50), nullable=True),
        sa.Column('row_count', sa.BigInteger, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_profiling_run_task', 'dim_profiling_run', ['profiling_task_id'])
    op.create_index('idx_profiling_run_status', 'dim_profiling_run', ['run_status'])
    op.create_index('idx_profiling_run_start', 'dim_profiling_run', ['run_start_time'])

    # dim_column
    op.create_table(
        'dim_column',
        sa.Column('column_id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('column_name', sa.String(255), nullable=False, unique=True),
        sa.Column('data_type', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_column_name', 'dim_column', ['column_name'])

    # dim_time
    op.create_table(
        'dim_time',
        sa.Column('time_id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('date', sa.DateTime, nullable=False, unique=True),
        sa.Column('year', sa.Integer, nullable=True),
        sa.Column('quarter', sa.Integer, nullable=True),
        sa.Column('month', sa.Integer, nullable=True),
        sa.Column('week', sa.Integer, nullable=True),
        sa.Column('day', sa.Integer, nullable=True),
        sa.Column('day_of_week', sa.Integer, nullable=True),
        sa.Column('day_name', sa.String(20), nullable=True),
        sa.Column('month_name', sa.String(20), nullable=True),
        sa.Column('is_weekend', sa.Integer, default=0),
    )
    op.create_index('idx_time_date', 'dim_time', ['date'])
    op.create_index('idx_time_year_month', 'dim_time', ['year', 'month'])

    # dim_connection
    op.create_table(
        'dim_connection',
        sa.Column('connection_id', sa.String(255), primary_key=True),
        sa.Column('connection_name', sa.String(255), nullable=True),
        sa.Column('connection_type', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )

    # Create fact tables

    # fact_profiling_result
    op.create_table(
        'fact_profiling_result',
        sa.Column('result_id', sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column('profiling_run_id', sa.String(255), sa.ForeignKey('dim_profiling_run.profiling_run_id'), nullable=False),
        sa.Column('profiling_task_id', sa.String(255), sa.ForeignKey('dim_profiling_task.profiling_task_id'), nullable=False),
        sa.Column('dq_asset_id', sa.String(255), sa.ForeignKey('dim_dq_asset.dq_asset_id'), nullable=False),
        sa.Column('column_id', sa.Integer, sa.ForeignKey('dim_column.column_id'), nullable=False),
        sa.Column('time_id', sa.Integer, sa.ForeignKey('dim_time.time_id'), nullable=False),
        sa.Column('metric_type', sa.String(100), nullable=False),
        sa.Column('metric_value', sa.Float, nullable=True),
        sa.Column('column_name', sa.String(255), nullable=True),
        sa.Column('run_timestamp', sa.DateTime, nullable=False),
        sa.Column('column_type', sa.String(100), nullable=True),
        sa.Column('column_id_external', sa.String(255), nullable=True),
        sa.Column('documented_data_type', sa.String(255), nullable=True),
        sa.Column('inferred_data_type', sa.String(255), nullable=True),
        sa.Column('inferred_patterns', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_result_run', 'fact_profiling_result', ['profiling_run_id'])
    op.create_index('idx_result_task', 'fact_profiling_result', ['profiling_task_id'])
    op.create_index('idx_result_asset', 'fact_profiling_result', ['dq_asset_id'])
    op.create_index('idx_result_column', 'fact_profiling_result', ['column_id'])
    op.create_index('idx_result_time', 'fact_profiling_result', ['time_id'])
    op.create_index('idx_result_metric_type', 'fact_profiling_result', ['metric_type'])
    op.create_index('idx_result_timestamp', 'fact_profiling_result', ['run_timestamp'])

    # fact_column_pattern
    op.create_table(
        'fact_column_pattern',
        sa.Column('pattern_id', sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column('profiling_run_id', sa.String(255), sa.ForeignKey('dim_profiling_run.profiling_run_id'), nullable=False),
        sa.Column('profiling_task_id', sa.String(255), sa.ForeignKey('dim_profiling_task.profiling_task_id'), nullable=False),
        sa.Column('column_id_external', sa.String(255), nullable=False),
        sa.Column('column_name', sa.String(255), nullable=True),
        sa.Column('domain_value', sa.String(500), nullable=True),
        sa.Column('pattern_label', sa.String(500), nullable=True),
        sa.Column('inferred_datatype', sa.String(500), nullable=True),
        sa.Column('satisfied_count', sa.BigInteger, nullable=True),
        sa.Column('satisfied_count_percent', sa.Float, nullable=True),
        sa.Column('total_rows', sa.BigInteger, nullable=True),
        sa.Column('run_timestamp', sa.DateTime, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_pattern_run', 'fact_column_pattern', ['profiling_run_id'])
    op.create_index('idx_pattern_task', 'fact_column_pattern', ['profiling_task_id'])
    op.create_index('idx_pattern_run_column', 'fact_column_pattern', ['profiling_run_id', 'column_id_external'])
    op.create_index('idx_pattern_task_time', 'fact_column_pattern', ['profiling_task_id', 'run_timestamp'])

    # fact_column_datatype
    op.create_table(
        'fact_column_datatype',
        sa.Column('datatype_id', sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column('profiling_run_id', sa.String(255), sa.ForeignKey('dim_profiling_run.profiling_run_id'), nullable=False),
        sa.Column('profiling_task_id', sa.String(255), sa.ForeignKey('dim_profiling_task.profiling_task_id'), nullable=False),
        sa.Column('column_id_external', sa.String(255), nullable=False),
        sa.Column('column_name', sa.String(255), nullable=True),
        sa.Column('datatype_category', sa.String(50), nullable=False),
        sa.Column('inferred_datatype', sa.String(500), nullable=True),
        sa.Column('frequency', sa.BigInteger, nullable=True),
        sa.Column('frequency_percent', sa.Float, nullable=True),
        sa.Column('total_rows', sa.BigInteger, nullable=True),
        sa.Column('run_timestamp', sa.DateTime, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_datatype_run', 'fact_column_datatype', ['profiling_run_id'])
    op.create_index('idx_datatype_task', 'fact_column_datatype', ['profiling_task_id'])
    op.create_index('idx_datatype_run_column', 'fact_column_datatype', ['profiling_run_id', 'column_id_external'])
    op.create_index('idx_datatype_task_time', 'fact_column_datatype', ['profiling_task_id', 'run_timestamp'])
    op.create_index('idx_datatype_category', 'fact_column_datatype', ['datatype_category', 'profiling_run_id'])

    # fact_column_value_frequency
    op.create_table(
        'fact_column_value_frequency',
        sa.Column('value_frequency_id', sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column('profiling_run_id', sa.String(255), sa.ForeignKey('dim_profiling_run.profiling_run_id'), nullable=False),
        sa.Column('profiling_task_id', sa.String(255), sa.ForeignKey('dim_profiling_task.profiling_task_id'), nullable=False),
        sa.Column('column_id_external', sa.String(255), nullable=False),
        sa.Column('column_name', sa.String(255), nullable=True),
        sa.Column('column_value', sa.Text, nullable=True),
        sa.Column('frequency', sa.BigInteger, nullable=True),
        sa.Column('percent', sa.Float, nullable=True),
        sa.Column('is_outlier', sa.Integer, default=0),
        sa.Column('value_rank', sa.Integer, nullable=True),
        sa.Column('run_timestamp', sa.DateTime, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_value_freq_run', 'fact_column_value_frequency', ['profiling_run_id'])
    op.create_index('idx_value_freq_task', 'fact_column_value_frequency', ['profiling_task_id'])
    op.create_index('idx_value_freq_run_column', 'fact_column_value_frequency', ['profiling_run_id', 'column_id_external'])
    op.create_index('idx_value_freq_task_time', 'fact_column_value_frequency', ['profiling_task_id', 'run_timestamp'])
    op.create_index('idx_value_freq_rank', 'fact_column_value_frequency', ['profiling_run_id', 'value_rank'])

    # fact_api_log
    op.create_table(
        'fact_api_log',
        sa.Column('log_id', sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column('timestamp', sa.DateTime, nullable=False),
        sa.Column('endpoint', sa.String(1000), nullable=False),
        sa.Column('http_method', sa.String(10), nullable=True),
        sa.Column('status_code', sa.Integer, nullable=True),
        sa.Column('duration_ms', sa.Integer, nullable=True),
        sa.Column('request_payload', sa.Text, nullable=True),
        sa.Column('response_payload', sa.Text, nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('profiling_task_id', sa.String(255), nullable=True),
        sa.Column('profiling_run_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_api_log_timestamp', 'fact_api_log', ['timestamp'])
    op.create_index('idx_api_log_endpoint', 'fact_api_log', ['endpoint'])
    op.create_index('idx_api_log_status', 'fact_api_log', ['status_code'])
    op.create_index('idx_api_log_task', 'fact_api_log', ['profiling_task_id'])
    op.create_index('idx_api_log_run', 'fact_api_log', ['profiling_run_id'])

    # Create application tables

    # sync_jobs
    op.create_table(
        'sync_jobs',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('connection_id', sa.String(255), nullable=True),
        sa.Column('connection_name', sa.String(255), nullable=True),
        sa.Column('sync_mode', sa.String(50), default='INCREMENTAL'),
        sa.Column('task_limit', sa.Integer, nullable=True),
        sa.Column('schedule_type', sa.String(50), default='MANUAL'),
        sa.Column('schedule_cron', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Integer, default=1),
        sa.Column('created_at', sa.DateTime, nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_sync_jobs_connection', 'sync_jobs', ['connection_id'])
    op.create_index('idx_sync_jobs_active', 'sync_jobs', ['is_active'])

    # sync_job_runs
    op.create_table(
        'sync_job_runs',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('sync_job_id', sa.Integer, sa.ForeignKey('sync_jobs.id'), nullable=False),
        sa.Column('status', sa.String(50), default='PENDING'),
        sa.Column('start_time', sa.DateTime, nullable=True),
        sa.Column('end_time', sa.DateTime, nullable=True),
        sa.Column('duration_seconds', sa.Integer, nullable=True),
        sa.Column('projects_processed', sa.Integer, default=0),
        sa.Column('tasks_processed', sa.Integer, default=0),
        sa.Column('runs_processed', sa.Integer, default=0),
        sa.Column('results_inserted', sa.Integer, default=0),
        sa.Column('errors_count', sa.Integer, default=0),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_sync_runs_job', 'sync_job_runs', ['sync_job_id'])
    op.create_index('idx_sync_runs_status', 'sync_job_runs', ['status'])
    op.create_index('idx_sync_runs_start', 'sync_job_runs', ['start_time'])


def downgrade():
    # Drop application tables
    op.drop_table('sync_job_runs')
    op.drop_table('sync_jobs')

    # Drop fact tables
    op.drop_table('fact_api_log')
    op.drop_table('fact_column_value_frequency')
    op.drop_table('fact_column_datatype')
    op.drop_table('fact_column_pattern')
    op.drop_table('fact_profiling_result')

    # Drop dimension tables (in reverse order due to foreign keys)
    op.drop_table('dim_connection')
    op.drop_table('dim_time')
    op.drop_table('dim_column')
    op.drop_table('dim_profiling_run')
    op.drop_table('dim_profiling_task')
    op.drop_table('dim_dq_asset')
