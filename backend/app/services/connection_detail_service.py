"""
Connection Detail Service
Fetches detailed connection information from FRS Documents API.
"""
import httpx
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models import DimConnection
from datetime import datetime


class ConnectionDetailService:
    """Service for fetching and storing connection details from IDMC FRS API."""

    def __init__(self, base_url: str, session_token: str):
        """
        Initialize the connection detail service.

        Args:
            base_url: IDMC base URL (e.g., https://na1.dm-us.informaticacloud.com)
            session_token: Authenticated session token
        """
        self.base_url = base_url.rstrip('/')
        self.session_token = session_token
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "INFA-SESSION-ID": session_token
        }

    async def fetch_connection_details(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch connection details from IDMC Connection API.

        Uses: GET /saas/api/v2/connection/{connectionId}

        Args:
            connection_id: Connection ID

        Returns:
            Connection details dictionary or None if not found
        """
        # Try the v2 connection API first (has more detailed info)
        url = f"{self.base_url}/saas/api/v2/connection/{connection_id}"

        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                print(f"Error fetching connection {connection_id} from v2 API: {e}")
                # Fall back to FRS Documents API
                return await self._fetch_from_frs(connection_id, client)
            except Exception as e:
                print(f"Unexpected error fetching connection {connection_id}: {e}")
                return None

    async def _fetch_from_frs(self, connection_id: str, client: httpx.AsyncClient) -> Optional[Dict[str, Any]]:
        """Fallback: Fetch from FRS Documents API."""
        url = f"{self.base_url}/frs/api/v1/Documents('{connection_id}')"
        try:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching connection {connection_id} from FRS: {e}")
            return None

    def parse_connection_attributes(self, connection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse connection attributes from API response.

        Handles both v2 Connection API and FRS Documents API responses.

        Args:
            connection_data: Raw connection data from API

        Returns:
            Parsed connection attributes
        """
        # Check if this is a v2 connection API response (has @type field)
        is_v2_api = connection_data.get("@type") == "connection"

        parsed = {
            "connection_id": connection_data.get("id"),
            "connection_name": connection_data.get("name"),
            "description": connection_data.get("description"),
        }

        if is_v2_api:
            # Parse v2 Connection API response
            parsed.update({
                "connection_type": connection_data.get("type"),
                "connection_sub_type": connection_data.get("baseType"),
                "connection_instance_name": connection_data.get("instanceDisplayName"),
                "created_by": connection_data.get("createdBy"),
                "last_updated_by": connection_data.get("updatedBy"),
                # Additional v2 fields (not in DimConnection model yet, but available)
                # "host": connection_data.get("host"),
                # "database": connection_data.get("database"),
                # "schema": connection_data.get("schema"),
                # "port": connection_data.get("port"),
            })
        else:
            # Parse FRS Documents API response
            parsed.update({
                "owner": connection_data.get("owner"),
                "created_by": connection_data.get("createdBy"),
                "last_updated_by": connection_data.get("lastUpdatedBy"),
                "last_accessed_by": connection_data.get("lastAccessedBy"),
                "document_type": connection_data.get("documentType"),
                "document_state": connection_data.get("documentState"),
                "acl_rule": connection_data.get("aclRule"),
                "is_source_controlled": connection_data.get("isSourceControlled", False),
            })

        # Parse timestamps (v2 API uses different field names)
        if is_v2_api:
            if connection_data.get("createTime"):
                parsed["created_time"] = self._parse_timestamp(connection_data["createTime"])
            if connection_data.get("updateTime"):
                parsed["last_updated_time"] = self._parse_timestamp(connection_data["updateTime"])
        else:
            if connection_data.get("createdTime"):
                parsed["created_time"] = self._parse_timestamp(connection_data["createdTime"])
            if connection_data.get("lastUpdatedTime"):
                parsed["last_updated_time"] = self._parse_timestamp(connection_data["lastUpdatedTime"])
            if connection_data.get("lastAccessedTime"):
                parsed["last_accessed_time"] = self._parse_timestamp(connection_data["lastAccessedTime"])
            if connection_data.get("expiresBy"):
                parsed["expires_by"] = self._parse_timestamp(connection_data["expiresBy"])

        # Parse parent hierarchy (only for FRS API)
        if not is_v2_api:
            parent_info = connection_data.get("parentInfo", [])
            for parent in parent_info:
                parent_type = parent.get("parentType")
                if parent_type == "Space":
                    parsed["space_id"] = parent.get("parentId")
                    parsed["space_name"] = parent.get("parentName")
                elif parent_type == "Project":
                    parsed["project_id"] = parent.get("parentId")
                    parsed["project_name"] = parent.get("parentName")
                elif parent_type == "Folder":
                    parsed["folder_id"] = parent.get("parentId")
                    parsed["folder_name"] = parent.get("parentName")

            # Parse custom attributes (only for FRS API)
            custom_attrs = connection_data.get("customAttributes", {})
            string_attrs = custom_attrs.get("stringAttrs", [])
            for attr in string_attrs:
                if attr.get("name") == "CONNECTION_TYPE":
                    parsed["connection_type"] = attr.get("value")
                elif attr.get("name") == "CONNECTION_SUB_TYPE":
                    parsed["connection_sub_type"] = attr.get("value")
                elif attr.get("name") == "CONNECTION_INSTANCE_NAME":
                    parsed["connection_instance_name"] = attr.get("value")

            # Parse repo info (only for FRS API)
            repo_info = connection_data.get("repoInfo", {})
            parsed["repo_handle"] = repo_info.get("repoHandle")

        return parsed

    def _parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Parse ISO timestamp string to datetime."""
        try:
            # Handle ISO 8601 format: 2019-11-22T21:10:08Z
            return datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%SZ")
        except:
            try:
                # Handle format with milliseconds
                return datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S.%fZ")
            except:
                return None

    def upsert_connection(self, db: Session, org_id: str, connection_data: Dict[str, Any]) -> DimConnection:
        """
        Create or update connection in database.

        Args:
            db: Database session
            org_id: Organization ID
            connection_data: Parsed connection data

        Returns:
            DimConnection instance
        """
        connection_id = connection_data["connection_id"]

        # Check if exists
        existing = db.query(DimConnection).filter(
            DimConnection.connection_id == connection_id
        ).first()

        if existing:
            # Update existing
            for key, value in connection_data.items():
                if key != "connection_id" and hasattr(existing, key):
                    setattr(existing, key, value)
            existing.org_id = org_id
            existing.updated_at = datetime.utcnow()
            connection = existing
        else:
            # Create new
            connection = DimConnection(
                org_id=org_id,
                **connection_data
            )
            db.add(connection)

        db.commit()
        db.refresh(connection)
        return connection

    async def sync_connection(self, db: Session, org_id: str, connection_id: str) -> Optional[DimConnection]:
        """
        Fetch and sync a single connection.

        Args:
            db: Database session
            org_id: Organization ID
            connection_id: FRS connection document ID

        Returns:
            DimConnection instance or None if failed
        """
        # Fetch from API
        raw_data = await self.fetch_connection_details(connection_id)
        if not raw_data:
            return None

        # Parse attributes
        parsed_data = self.parse_connection_attributes(raw_data)

        # Upsert to database
        return self.upsert_connection(db, org_id, parsed_data)
