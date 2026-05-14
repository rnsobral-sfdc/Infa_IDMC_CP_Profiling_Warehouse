"""
Project Service
Handles fetching project and folder names from IDMC
"""
import httpx
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)


class ProjectService:
    """Service to fetch project and folder information from IDMC."""

    def __init__(self, base_url: str, session_token: str):
        """
        Initialize project service.

        Args:
            base_url: IDMC base URL (e.g., https://dm-us.informaticacloud.com)
            session_token: Active session token from login
        """
        self.base_url = base_url.rstrip('/')
        self.session_token = session_token
        self.client = httpx.AsyncClient(timeout=30.0, verify=False)

        # Cache for project and folder names
        self._project_cache: Dict[str, Dict] = {}
        self._folder_cache: Dict[str, Dict] = {}

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for IDMC API requests."""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "INFA-SESSION-ID": self.session_token
        }

    async def fetch_all_projects(self) -> List[Dict]:
        """
        Fetch all projects from IDMC.

        Endpoint: GET <baseApiUrl>/public/core/v3/objects?q=type=='Project'

        Returns:
            List of project objects with id, name, path, etc.
        """
        try:
            endpoint = f"{self.base_url}/public/core/v3/objects"
            params = {"q": "type=='Project'"}

            logger.info(f"Fetching projects from IDMC: {endpoint}")
            response = await self.client.get(
                endpoint,
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()

            data = response.json()
            projects = data.get("objects", [])

            # Cache projects by ID and path
            for project in projects:
                project_id = project.get("id")
                project_path = project.get("path")
                if project_id:
                    self._project_cache[project_id] = project
                if project_path:
                    self._project_cache[project_path] = project

            logger.info(f"Fetched {len(projects)} projects from IDMC")
            return projects

        except Exception as e:
            logger.error(f"Error fetching projects: {e}")
            return []

    async def fetch_all_folders(self) -> List[Dict]:
        """
        Fetch all folders from IDMC.

        Endpoint: GET <baseApiUrl>/public/core/v3/objects?q=type=='Folder'

        Returns:
            List of folder objects with id, name, path, etc.
        """
        try:
            endpoint = f"{self.base_url}/public/core/v3/objects"
            params = {"q": "type=='Folder'"}

            logger.info(f"Fetching folders from IDMC: {endpoint}")
            response = await self.client.get(
                endpoint,
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()

            data = response.json()
            folders = data.get("objects", [])

            # Cache folders by ID and path
            for folder in folders:
                folder_id = folder.get("id")
                folder_path = folder.get("path")
                if folder_id:
                    self._folder_cache[folder_id] = folder
                if folder_path:
                    self._folder_cache[folder_path] = folder

            logger.info(f"Fetched {len(folders)} folders from IDMC")
            return folders

        except Exception as e:
            logger.error(f"Error fetching folders: {e}")
            return []

    def get_project_name(self, project_id_or_path: str) -> Optional[str]:
        """
        Get project display name from ID or path.

        Args:
            project_id_or_path: Project ID (e.g., '5CXcJvMufMRcrWHj89a5KP') or path

        Returns:
            Project display name or None if not found
        """
        project = self._project_cache.get(project_id_or_path)
        if project:
            return project.get("name")
        return None

    def get_project_id(self, project_path: str) -> Optional[str]:
        """
        Get project ID from path.

        Args:
            project_path: Project path

        Returns:
            Project ID or None if not found
        """
        project = self._project_cache.get(project_path)
        if project:
            return project.get("id")
        return None

    def get_folder_name(self, folder_id_or_path: str) -> Optional[str]:
        """
        Get folder display name from ID or path.

        Args:
            folder_id_or_path: Folder ID or path

        Returns:
            Folder display name or None if not found
        """
        folder = self._folder_cache.get(folder_id_or_path)
        if folder:
            return folder.get("name")
        return None

    def get_folder_id(self, folder_path: str) -> Optional[str]:
        """
        Get folder ID from path.

        Args:
            folder_path: Folder path

        Returns:
            Folder ID or None if not found
        """
        folder = self._folder_cache.get(folder_path)
        if folder:
            return folder.get("id")
        return None

    async def resolve_project_folder_names(self, project_id: str, folder_id: Optional[str] = None) -> Dict:
        """
        Resolve project and folder display names from IDMC object IDs.

        Args:
            project_id: Project ID from profiling API (e.g., "4PPJ0KtL8mTcrWHj89a5KP")
            folder_id: Optional folder ID from profiling API (e.g., "5BztkPF3nRQbsWKm82c6HP")

        Returns:
            Dict with project_display_name, folder_display_name
        """
        # Ensure cache is populated
        if not self._project_cache:
            await self.fetch_all_projects()
        if not self._folder_cache:
            await self.fetch_all_folders()

        result = {
            "project_display_name": None,
            "folder_display_name": None
        }

        # Resolve project by ID
        project = self._project_cache.get(project_id)
        if project:
            result["project_display_name"] = project.get("name")

        # Resolve folder by ID (if provided)
        if folder_id:
            folder = self._folder_cache.get(folder_id)
            if folder:
                result["folder_display_name"] = folder.get("name")

        return result

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
