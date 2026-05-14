"""add_value_frequency_fields

Revision ID: 98b35014cb38
Revises: 27a6d3f0f595
Create Date: 2026-05-05 08:17:32.226545

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '98b35014cb38'
down_revision = '27a6d3f0f595'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table exists (migration 27a6d3f0f595 drops it)
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    if 'fact_column_value_frequency' not in tables:
        # Recreate table with new columns included
        op.create_table(
            'fact_column_value_frequency',
            sa.Column('value_frequency_id', sa.BigInteger, primary_key=True, autoincrement=True),
            sa.Column('org_id', sa.String(255), nullable=True),
            sa.Column('run_key', sa.String(50), nullable=True),
            sa.Column('profiling_run_id', sa.String(255), nullable=False),
            sa.Column('profiling_task_id', sa.String(255), nullable=False),
            sa.Column('column_id_external', sa.String(255), nullable=False),
            sa.Column('column_name', sa.String(255), nullable=True),
            sa.Column('column_value', sa.Text, nullable=True),
            sa.Column('frequency', sa.BigInteger, nullable=True),
            sa.Column('percent', sa.Float, nullable=True),
            sa.Column('is_outlier', sa.Integer, default=0),
            sa.Column('total_rows', sa.BigInteger, nullable=True, comment='Total rows in profiling run'),
            sa.Column('row_identifier', sa.BigInteger, nullable=True, comment='Row identifier for this value occurrence'),
            sa.Column('value_length', sa.Integer, nullable=True, comment='Length of the column value'),
            sa.Column('value_rank', sa.Integer, nullable=True),
            sa.Column('run_timestamp', sa.DateTime, nullable=False),
            sa.Column('created_at', sa.DateTime, nullable=True),
        )
        op.create_index('idx_column_value_freq_org', 'fact_column_value_frequency', ['org_id'])
        op.create_index('idx_column_value_freq_run_key', 'fact_column_value_frequency', ['run_key'])
        op.create_index('idx_value_freq_run', 'fact_column_value_frequency', ['profiling_run_id'])
        op.create_index('idx_value_freq_task', 'fact_column_value_frequency', ['profiling_task_id'])
        op.create_index('idx_value_freq_run_column', 'fact_column_value_frequency', ['profiling_run_id', 'column_id_external'])
        op.create_index('idx_value_freq_task_time', 'fact_column_value_frequency', ['profiling_task_id', 'run_timestamp'])
        op.create_index('idx_value_freq_rank', 'fact_column_value_frequency', ['profiling_run_id', 'value_rank'])
    else:
        # Table exists, just add new columns
        with op.batch_alter_table('fact_column_value_frequency', schema=None) as batch_op:
            batch_op.add_column(sa.Column('total_rows', sa.BigInteger(), nullable=True,
                               comment='Total rows in profiling run'))
            batch_op.add_column(sa.Column('row_identifier', sa.BigInteger(), nullable=True,
                               comment='Row identifier for this value occurrence'))
            batch_op.add_column(sa.Column('value_length', sa.Integer(), nullable=True,
                               comment='Length of the column value'))


def downgrade() -> None:
    # Remove columns or drop table depending on what upgrade did
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    if 'fact_column_value_frequency' in tables:
        columns = [col['name'] for col in inspector.get_columns('fact_column_value_frequency')]
        if 'total_rows' in columns or 'row_identifier' in columns or 'value_length' in columns:
            with op.batch_alter_table('fact_column_value_frequency', schema=None) as batch_op:
                if 'value_length' in columns:
                    batch_op.drop_column('value_length')
                if 'row_identifier' in columns:
                    batch_op.drop_column('row_identifier')
                if 'total_rows' in columns:
                    batch_op.drop_column('total_rows')
