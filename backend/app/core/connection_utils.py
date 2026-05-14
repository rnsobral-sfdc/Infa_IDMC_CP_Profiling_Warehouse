"""
Helper utilities for connection management.
"""
from typing import Optional
from sqlalchemy.orm import Session
from ..models.application import IDMCConnection


def get_active_org_id(db: Session) -> Optional[str]:
    """
    Get the org_id of the currently active connection.

    Args:
        db: Database session

    Returns:
        org_id of the active connection, or None if no active connection exists
    """
    active_connection = db.query(IDMCConnection).filter(
        IDMCConnection.last_test_status == "SUCCESS"
    ).first()

    return active_connection.org_id if active_connection else None


def get_active_connection(db: Session) -> Optional[IDMCConnection]:
    """
    Get the currently active connection.

    Args:
        db: Database session

    Returns:
        The active IDMCConnection object, or None if no active connection exists
    """
    return db.query(IDMCConnection).filter(
        IDMCConnection.last_test_status == "SUCCESS"
    ).first()
