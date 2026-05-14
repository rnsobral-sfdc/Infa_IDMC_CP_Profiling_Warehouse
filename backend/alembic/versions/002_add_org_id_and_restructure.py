"""Add org_id to all tables and restructure profiling path

Revision ID: 002
Revises: 001
Create Date: 2026-05-01

Changes:
1. Add org_id as first column to all dimension and fact tables
2. Move project_name, folder_path to dim_profiling_task (from dim_dq_asset)
3. Add run_key to fact_column_datatype, fact_column_pattern, fact_column_value_frequency
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add org_id to all tables (SQLite doesn't support FIRST, columns added at end)
    # Dimension tables
    with op.batch_alter_table('dim_dq_asset', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.create_index('idx_dq_asset_org', ['org_id'])

    with op.batch_alter_table('dim_profiling_task', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('project_name', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('project_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('project_display_name', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('folder_path', sa.String(1000), nullable=True))
        batch_op.add_column(sa.Column('folder_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('folder_display_name', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('full_path', sa.String(2000), nullable=True))
        batch_op.create_index('idx_profiling_task_org', ['org_id'])
        batch_op.create_index('idx_profiling_task_project', ['project_name'])

    with op.batch_alter_table('dim_profiling_run', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.create_index('idx_profiling_run_org', ['org_id'])

    with op.batch_alter_table('dim_column', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.create_index('idx_column_org', ['org_id'])

    with op.batch_alter_table('dim_time', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.create_index('idx_time_org', ['org_id'])

    with op.batch_alter_table('dim_connection', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.create_index('idx_connection_org', ['org_id'])

    # Fact tables
    with op.batch_alter_table('fact_profiling_result', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.create_index('idx_profiling_result_org', ['org_id'])

    with op.batch_alter_table('fact_column_pattern', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('run_key', sa.String(50), nullable=True))
        batch_op.create_index('idx_column_pattern_org', ['org_id'])
        batch_op.create_index('idx_column_pattern_run_key', ['run_key'])

    with op.batch_alter_table('fact_column_datatype', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('run_key', sa.String(50), nullable=True))
        batch_op.create_index('idx_column_datatype_org', ['org_id'])
        batch_op.create_index('idx_column_datatype_run_key', ['run_key'])

    with op.batch_alter_table('fact_column_value_frequency', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('run_key', sa.String(50), nullable=True))
        batch_op.create_index('idx_column_value_freq_org', ['org_id'])
        batch_op.create_index('idx_column_value_freq_run_key', ['run_key'])

    with op.batch_alter_table('fact_api_log', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.create_index('idx_api_log_org', ['org_id'])

    # Application tables
    with op.batch_alter_table('sync_jobs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.create_index('idx_sync_jobs_org', ['org_id'])

    with op.batch_alter_table('sync_job_runs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('org_id', sa.String(255), nullable=True))
        batch_op.create_index('idx_sync_job_runs_org', ['org_id'])


def downgrade():
    # Remove org_id from all tables
    with op.batch_alter_table('dim_dq_asset', schema=None) as batch_op:
        batch_op.drop_index('idx_dq_asset_org')
        batch_op.drop_column('org_id')

    with op.batch_alter_table('dim_profiling_task', schema=None) as batch_op:
        batch_op.drop_index('idx_profiling_task_org')
        batch_op.drop_index('idx_profiling_task_project')
        batch_op.drop_column('org_id')
        batch_op.drop_column('project_name')
        batch_op.drop_column('project_id')
        batch_op.drop_column('project_display_name')
        batch_op.drop_column('folder_path')
        batch_op.drop_column('folder_id')
        batch_op.drop_column('folder_display_name')
        batch_op.drop_column('full_path')

    with op.batch_alter_table('dim_profiling_run', schema=None) as batch_op:
        batch_op.drop_index('idx_profiling_run_org')
        batch_op.drop_column('org_id')

    with op.batch_alter_table('dim_column', schema=None) as batch_op:
        batch_op.drop_index('idx_column_org')
        batch_op.drop_column('org_id')

    with op.batch_alter_table('dim_time', schema=None) as batch_op:
        batch_op.drop_index('idx_time_org')
        batch_op.drop_column('org_id')

    with op.batch_alter_table('dim_connection', schema=None) as batch_op:
        batch_op.drop_index('idx_connection_org')
        batch_op.drop_column('org_id')

    with op.batch_alter_table('fact_profiling_result', schema=None) as batch_op:
        batch_op.drop_index('idx_profiling_result_org')
        batch_op.drop_column('org_id')

    with op.batch_alter_table('fact_column_pattern', schema=None) as batch_op:
        batch_op.drop_index('idx_column_pattern_org')
        batch_op.drop_index('idx_column_pattern_run_key')
        batch_op.drop_column('org_id')
        batch_op.drop_column('run_key')

    with op.batch_alter_table('fact_column_datatype', schema=None) as batch_op:
        batch_op.drop_index('idx_column_datatype_org')
        batch_op.drop_index('idx_column_datatype_run_key')
        batch_op.drop_column('org_id')
        batch_op.drop_column('run_key')

    with op.batch_alter_table('fact_column_value_frequency', schema=None) as batch_op:
        batch_op.drop_index('idx_column_value_freq_org')
        batch_op.drop_index('idx_column_value_freq_run_key')
        batch_op.drop_column('org_id')
        batch_op.drop_column('run_key')

    with op.batch_alter_table('fact_api_log', schema=None) as batch_op:
        batch_op.drop_index('idx_api_log_org')
        batch_op.drop_column('org_id')

    with op.batch_alter_table('sync_jobs', schema=None) as batch_op:
        batch_op.drop_index('idx_sync_jobs_org')
        batch_op.drop_column('org_id')

    with op.batch_alter_table('sync_job_runs', schema=None) as batch_op:
        batch_op.drop_index('idx_sync_job_runs_org')
        batch_op.drop_column('org_id')
