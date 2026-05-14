#!/usr/bin/env python3
"""
Setup script for SQLite database.
Creates and initializes the database with schema and seed data.
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from app.core.database import Base, engine, init_db
from app.models import *  # Import all models


def setup_database():
    """Create database and initialize with schema."""
    print("="*70)
    print(" IDMC Profiling Extractor - SQLite Database Setup")
    print("="*70)
    print()

    # Check if database already exists
    db_path = Path("idmc_profiling.db")
    if db_path.exists():
        response = input("Database already exists. Recreate? (yes/no): ")
        if response.lower() != "yes":
            print("Setup cancelled.")
            return

        # Backup existing database
        backup_path = Path("idmc_profiling.db.backup")
        if backup_path.exists():
            backup_path.unlink()
        db_path.rename(backup_path)
        print(f"✓ Existing database backed up to {backup_path}")
        print()

    print("Creating database tables...")
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✓ All tables created successfully")
        print()

        # Import seed data functions
        from datetime import datetime, date, timedelta
        from sqlalchemy.orm import Session

        print("Loading seed data...")

        # Create session
        from app.core.database import SessionLocal
        db = SessionLocal()

        try:
            # Create default admin user
            from app.models import User

            # Pre-hashed passwords to avoid bcrypt compatibility issues during setup
            # Password: admin123
            admin_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lZjNr6VzZ7nS"
            # Password: user123
            user_hash = "$2b$12$XJGnN8FqUPzVw0YGEZnMr.vYoqJ4S7YqUjKxKcRZTxW7zQnN4FVCK"

            admin_user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=admin_hash,
                full_name="System Administrator",
                is_admin=True
            )
            db.add(admin_user)

            # Create test user
            test_user = User(
                username="testuser",
                email="testuser@example.com",
                hashed_password=user_hash,
                full_name="Test User",
                is_admin=False
            )
            db.add(test_user)

            db.commit()
            print("✓ Users created:")
            print("  - admin / admin123 (Administrator)")
            print("  - testuser / user123 (Regular User)")
            print()

            # Create time dimension data for current year and previous year
            from app.models import DimTime

            print("Creating time dimension...")
            start_date = date.today() - timedelta(days=365)
            end_date = date.today() + timedelta(days=365)

            current_date = start_date
            count = 0
            while current_date <= end_date:
                dt = datetime.combine(current_date, datetime.min.time())

                time_dim = DimTime(
                    date=dt,
                    year=dt.year,
                    month=dt.month,
                    day=dt.day,
                    week=dt.isocalendar()[1],
                    quarter=(dt.month - 1) // 3 + 1,
                    day_of_week=dt.weekday(),
                    day_name=dt.strftime("%A"),
                    month_name=dt.strftime("%B"),
                    is_weekend=1 if dt.weekday() >= 5 else 0
                )

                db.add(time_dim)
                count += 1

                current_date += timedelta(days=1)

            db.commit()
            print(f"✓ Time dimension created: {count} records")
            print()

        finally:
            db.close()

        print("="*70)
        print(" Database Setup Complete!")
        print("="*70)
        print()
        print("Database location:", os.path.abspath("idmc_profiling.db"))
        print()
        print("Next steps:")
        print("  1. Start the application: START.bat or ./START.sh")
        print("  2. Open browser: http://localhost:3000")
        print("  3. Login with: admin / admin123")
        print()

    except Exception as e:
        print(f"✗ Error during setup: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(setup_database())
