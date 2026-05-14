from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class IDMCConnectionCreate(BaseModel):
    name: str
    base_url: str
    username: str
    password: str


class IDMCConnectionUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    profiling_url: Optional[str] = None


class IDMCConnectionResponse(BaseModel):
    id: int
    name: str
    base_url: str
    org_id: Optional[str]
    org_name: Optional[str]
    profiling_url: Optional[str]
    username: str
    is_active: bool
    last_test_at: Optional[datetime]
    last_test_status: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
    org_id: Optional[str]
    org_name: Optional[str]
    profiling_url: Optional[str]
    timestamp: datetime
    disconnected_connections: Optional[List[str]] = None
