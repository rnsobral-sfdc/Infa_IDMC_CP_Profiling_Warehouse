"""
Service to fetch project paths from IDMC Objects API.
Uses Objects API with type=='Project' to get full path from path field.
"""
from typing import Dict, List, Optional
import httpx
from ..core.config import settings


class ProfileService:
    """Service to fetch projects with full paths from IDMC Objects API."""

    def __init__(self, base_url: str, session_id: str):
        self.base_url = base_url
        self.session_id = session_id
        self._projects_cache: Dict[str, Dict] = {}

    async def fetch_all_profile_objects(self) -> None:
        """
        Fetch all projects from Objects API to get their full paths.

        GET /saas/public/core/v3/objects?q=type=='Project'

        Caches projects by their ID (which matches frsProjectId from profiling API).
        The 'path' field contains the full project path.
        """
        # Use region-specific URL (na1 prefix)
        # Extract region from base_url if it contains it, otherwise use na1
        if 'na1' in self.base_url or 'na1-' in self.base_url:
            objects_url = "https://na1.dm-us.informaticacloud.com/saas/public/core/v3/objects"
        else:
            # Default to na1, could be enhanced to detect region
            objects_url = "https://na1.dm-us.informaticacloud.com/saas/public/core/v3/objects"

        headers = {
            "INFA-SESSION-ID": self.session_id,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        # Increase timeout to 120 seconds for large organizations with many projects
        timeout = httpx.Timeout(120.0, connect=30.0)
        async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
            # Fetch projects with type=='Project'
            params_projects = {"q": "type=='Project'"}

            # Retry logic for timeout errors
            max_retries = 2
            for attempt in range(max_retries + 1):
                try:
                    print(f"           Fetching projects from Objects API (attempt {attempt + 1}/{max_retries + 1})...")
                    response = await client.get(objects_url, headers=headers, params=params_projects)
                    response.raise_for_status()
                    projects_data = response.json()
                    projects = projects_data.get("objects", [])

                    # Cache projects by id (which matches frsProjectId)
                    for proj in projects:
                        proj_id = proj.get('id')
                        if proj_id:
                            self._projects_cache[proj_id] = proj

                    print(f"           Loaded {len(self._projects_cache)} projects into cache")
                    break  # Success, exit retry loop

                except httpx.ReadTimeout as e:
                    if attempt < max_retries:
                        print(f"           Request timed out, retrying... ({attempt + 1}/{max_retries})")
                        continue
                    else:
                        print(f"           FATAL: Request timed out after {max_retries + 1} attempts")
                        raise  # Re-raise the timeout error after all retries exhausted

                except httpx.HTTPStatusError as e:
                    # If the Objects API returns 500 or other errors, this is not fatal
                    # The sync can continue without project path information
                    print(f"           WARNING: Failed to fetch projects from Objects API: {e}")
                    print(f"           Continuing sync without project path information...")
                    break  # Exit retry loop, continue without project data

                except Exception as e:
                    # Catch any other unexpected errors
                    print(f"           WARNING: Unexpected error fetching projects: {e}")
                    print(f"           Continuing sync without project path information...")
                    break  # Exit retry loop, continue without project data

    def get_project_path(self, frs_project_id: str) -> str:
        """
        Get full project path for a given frsProjectId.

        Args:
            frs_project_id: The frsProjectId from profiling API

        Returns: Full path from 'path' field (e.g., 'CDQ_Demo_2021' or '_RNS_Demos') or empty string if not found
        """
        proj = self._projects_cache.get(frs_project_id)
        if proj:
            # Return the path field which contains the full project path
            path = proj.get('path', '')
            # Strip leading/trailing slashes
            return path.strip('/')
        return ''

    def get_project_name(self, frs_project_id: str) -> str:
        """
        Get project name for a given frsProjectId.

        Args:
            frs_project_id: The frsProjectId from profiling API

        Returns: Project name or empty string if not found
        """
        proj = self._projects_cache.get(frs_project_id)
        return proj.get('name', '') if proj else ''
