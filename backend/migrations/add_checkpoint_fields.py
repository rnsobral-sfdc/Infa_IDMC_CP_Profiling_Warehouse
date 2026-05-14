"""
Add checkpoint fields to sync_job_runs table for stop/resume functionality.
Run this migration to add the new fields.
"""
import sqlite3
import sys
import os

def migrate():
    """Add checkpoint fields to sync_job_runs table."""
    # Find database file
    possible_paths = [
        "data/idmc_profiling.db",
        "../data/idmc_profiling.db",
        "C:/Temp/Claude/ProfilingReport/backend/data/idmc_profiling.db"
    ]

    db_path = None
    for path in possible_paths:
        if os.path.exists(path):
            db_path = path
            break

    if not db_path:
        print("Error: Database file not found")
        print("Searched paths:", possible_paths)
        sys.exit(1)

    print(f"Using database: {db_path}")

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("Adding checkpoint fields to sync_job_runs table...")

        # Check if fields already exist
        cursor.execute("PRAGMA table_info(sync_job_runs)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'checkpoint_data' not in columns:
            cursor.execute("""
                ALTER TABLE sync_job_runs
                ADD COLUMN checkpoint_data TEXT
            """)
            print("  OK Added checkpoint_data column")
        else:
            print("  - checkpoint_data column already exists")

        if 'last_processed_profile_id' not in columns:
            cursor.execute("""
                ALTER TABLE sync_job_runs
                ADD COLUMN last_processed_profile_id VARCHAR(255)
            """)
            print("  OK Added last_processed_profile_id column")
        else:
            print("  - last_processed_profile_id column already exists")

        if 'stop_requested' not in columns:
            cursor.execute("""
                ALTER TABLE sync_job_runs
                ADD COLUMN stop_requested INTEGER DEFAULT 0
            """)
            print("  OK Added stop_requested column")
        else:
            print("  - stop_requested column already exists")

        conn.commit()
        print("\nOK Migration completed successfully")

    except Exception as e:
        print(f"\nError: Migration failed: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate()
