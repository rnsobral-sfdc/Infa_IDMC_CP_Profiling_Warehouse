import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from .auth_service import IDMCAuthService
from .logging_service import APILoggingService
import time


class MetadataService:
    """
    Service for fetching metadata from IDMC:
    - Projects
    - Folders
    - Profiling tasks/assets
    - Connections

    This service implements the hierarchical extraction logic required by IDMC APIs.
    """

    def __init__(self, auth_service: IDMCAuthService, logging_service: Optional[APILoggingService] = None):
        self.auth = auth_service
        self.logger = logging_service
        self.client = httpx.AsyncClient(timeout=60.0, verify=False)

    async def _make_request(
        self,
        endpoint: str,
        method: str = "GET",
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None,
        context_task_id: Optional[str] = None,
        context_run_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Make an authenticated HTTP request to IDMC API and log it.

        Args:
            endpoint: API endpoint path
            method: HTTP method
            params: Query parameters
            json_data: Request body
            context_task_id: Profiling task ID for logging context
            context_run_id: Profiling run ID for logging context

        Returns:
            Response data as dictionary
        """
        # Ensure authentication
        await self.auth.ensure_authenticated()

        full_url = f"{self.auth.base_url}{endpoint}"
        headers = self.auth._get_auth_headers()

        start_time = time.time()
        status_code = None
        response_data = None
        error_message = None

        try:
            if method == "GET":
                response = await self.client.get(full_url, headers=headers, params=params)
            elif method == "POST":
                response = await self.client.post(full_url, headers=headers, json=json_data, params=params)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            status_code = response.status_code
            response.raise_for_status()
            response_data = response.json()

            return response_data

        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_message = f"HTTP {status_code}: {e.response.text}"
            response_data = {"error": error_message}
            raise

        except Exception as e:
            error_message = str(e)
            response_data = {"error": error_message}
            raise

        finally:
            # Log the API call
            duration_ms = int((time.time() - start_time) * 1000)

            if self.logger:
                try:
                    await self.logger.log_api_call(
                        endpoint=full_url,
                        http_method=method,
                        status_code=status_code,
                        request_payload={"params": params, "body": json_data} if params or json_data else None,
                        response_payload=response_data,
                        duration_ms=duration_ms,
                        error_message=error_message,
                        profiling_task_id=context_task_id,
                        profiling_run_id=context_run_id
                    )
                except Exception:
                    # Don't fail request if logging fails
                    pass

    async def get_projects(self) -> List[Dict[str, Any]]:
        """
        Fetch all projects from IDMC.

        Returns:
            List of project dictionaries
        """
        # IDMC API endpoint for projects (adjust based on actual API)
        # Common patterns: /api/v2/projects, /saas/public/core/v3/projects
        endpoint = "/api/v2/projects"

        try:
            response = await self._make_request(endpoint)

            # Response structure varies by API version
            # Common patterns:
            # - {"projects": [...]}
            # - {"data": [...]}
            # - [...]
            projects = response.get("projects") or response.get("data") or response

            if not isinstance(projects, list):
                projects = [projects]

            return projects

        except Exception as e:
            print(f"Error fetching projects: {e}")
            return []

    async def get_folders(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Fetch folders within a project.

        Args:
            project_id: Project identifier

        Returns:
            List of folder dictionaries
        """
        endpoint = f"/api/v2/projects/{project_id}/folders"

        try:
            response = await self._make_request(endpoint)
            folders = response.get("folders") or response.get("data") or response

            if not isinstance(folders, list):
                folders = [folders]

            return folders

        except Exception as e:
            print(f"Error fetching folders for project {project_id}: {e}")
            return []

    async def get_profiling_tasks(
        self,
        project_id: Optional[str] = None,
        folder_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch profiling tasks/assets.

        Args:
            project_id: Filter by project (optional)
            folder_id: Filter by folder (optional)

        Returns:
            List of profiling task dictionaries
        """
        # IDMC profiling tasks endpoint
        # Common patterns:
        # - /api/v2/profiling/tasks
        # - /api/v2/dq/assets?type=profile
        endpoint = "/api/v2/profiling/tasks"

        params = {}
        if project_id:
            params["projectId"] = project_id
        if folder_id:
            params["folderId"] = folder_id

        try:
            response = await self._make_request(endpoint, params=params)
            tasks = response.get("tasks") or response.get("assets") or response.get("data") or response

            if not isinstance(tasks, list):
                tasks = [tasks]

            return tasks

        except Exception as e:
            print(f"Error fetching profiling tasks: {e}")
            return []

    async def get_profiling_task_details(self, task_id: str) -> Dict[str, Any]:
        """
        Fetch detailed information about a specific profiling task.

        Args:
            task_id: Profiling task identifier

        Returns:
            Task details dictionary
        """
        endpoint = f"/api/v2/profiling/tasks/{task_id}"

        try:
            response = await self._make_request(endpoint, context_task_id=task_id)
            return response

        except Exception as e:
            print(f"Error fetching task details for {task_id}: {e}")
            return {}

    async def get_connections(self) -> List[Dict[str, Any]]:
        """
        Fetch all connections (data source connections) from IDMC.

        Returns:
            List of connection dictionaries
        """
        endpoint = "/api/v2/connections"

        try:
            response = await self._make_request(endpoint)
            connections = response.get("connections") or response.get("data") or response

            if not isinstance(connections, list):
                connections = [connections]

            return connections

        except Exception as e:
            print(f"Error fetching connections: {e}")
            return []

    async def get_dq_assets(
        self,
        project_id: Optional[str] = None,
        folder_id: Optional[str] = None,
        asset_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch Data Quality assets (objects being profiled).

        Args:
            project_id: Filter by project
            folder_id: Filter by folder
            asset_type: Filter by asset type

        Returns:
            List of DQ asset dictionaries
        """
        endpoint = "/api/v2/dq/assets"

        params = {}
        if project_id:
            params["projectId"] = project_id
        if folder_id:
            params["folderId"] = folder_id
        if asset_type:
            params["type"] = asset_type

        try:
            response = await self._make_request(endpoint, params=params)
            assets = response.get("assets") or response.get("data") or response

            if not isinstance(assets, list):
                assets = [assets]

            return assets

        except Exception as e:
            print(f"Error fetching DQ assets: {e}")
            return []

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
