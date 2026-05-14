import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from .auth_service import IDMCAuthService
from .logging_service import APILoggingService
import time


class ProfilingService:
    """
    Service for fetching profiling execution data from IDMC using the WORKING endpoints:
    - List profiles: /profiling-service/api/v1/profile
    - Get profile details: /profiling-service/api/v1/profile/{id}
    - Get run details: /profiling-service/api/v1/runDetail?profileId={id}
    - Get column statistics: /metric-store/api/v1/odata/Profiles('{id}')/Columns

    Implements incremental extraction logic based on run timestamps.
    """

    def __init__(self, auth_service: IDMCAuthService, logging_service: Optional[APILoggingService] = None):
        self.auth = auth_service
        self.logger = logging_service
        self.client = httpx.AsyncClient(timeout=60.0, verify=False)

        # Use profiling URL if available, otherwise use base URL
        if hasattr(auth_service, 'profiling_url') and auth_service.profiling_url:
            self.profiling_base_url = auth_service.profiling_url
        else:
            self.profiling_base_url = auth_service.base_url

    async def _make_request(
        self,
        endpoint: str,
        method: str = "GET",
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None,
        context_task_id: Optional[str] = None,
        context_run_id: Optional[str] = None,
        use_profiling_headers: bool = True
    ) -> Dict[str, Any]:
        """Make an authenticated HTTP request to IDMC API and log it."""
        await self.auth.ensure_authenticated()

        full_url = f"{self.profiling_base_url}{endpoint}"
        headers = self.auth._get_auth_headers(for_profiling=use_profiling_headers)

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
                    pass

    async def get_all_profiles(self) -> List[Dict[str, Any]]:
        """
        Fetch all profiling profiles/tasks from IDMC.

        Uses: GET /profiling-service/api/v1/profile

        Returns:
            List of profile dictionaries with keys:
            - id, profileKey, name, frsId, frsProjectId, frsFolderId
            - connectionId, createdBy, createdByName, createTime
            - lastRunKey, version, profileType, etc.
        """
        endpoint = "/profiling-service/api/v1/profile"

        try:
            response = await self._make_request(endpoint)
            profiles = response if isinstance(response, list) else []
            print(f"           Retrieved {len(profiles)} profiles from API")
            return profiles

        except Exception as e:
            import traceback
            print(f"           ERROR fetching all profiles: {e}")
            print(f"           Traceback: {traceback.format_exc()}")
            return []

    async def get_profile_details(self, profile_id: str) -> Dict[str, Any]:
        """
        Fetch detailed profile information including source columns.

        Uses: GET /profiling-service/api/v1/profile/{profileId}

        Args:
            profile_id: Profile UUID

        Returns:
            Profile details with source.fields[], profileableFields[], etc.
        """
        endpoint = f"/profiling-service/api/v1/profile/{profile_id}"

        try:
            response = await self._make_request(endpoint, context_task_id=profile_id)
            return response

        except Exception as e:
            print(f"Error fetching profile details for {profile_id}: {e}")
            return {}

    async def get_profiling_runs(
        self,
        task_id: str,
        since: Optional[datetime] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch profiling run details for a specific profile.

        Uses: GET /profiling-service/api/v1/runDetail?profileId={profileId}

        This is critical for incremental extraction:
        - If 'since' is provided, only fetch runs after that timestamp
        - This enables delta/incremental loading

        Args:
            task_id: Profiling profile identifier (UUID)
            since: Only fetch runs after this timestamp (for incremental extraction)
            status: Filter by run status (COMPLETED, FAILED, etc.)

        Returns:
            List of profiling run dictionaries with keys:
            - id, profileId, runKey, status, startTime, endTime
            - executionTime, createdByName, rowsProcessed, samplingType, etc.
        """
        endpoint = "/profiling-service/api/v1/runDetail"
        params = {"profileId": task_id}

        try:
            response = await self._make_request(endpoint, params=params, context_task_id=task_id)
            runs = response if isinstance(response, list) else []

            # If API doesn't support filtering by date, filter locally
            if since and runs:
                runs = [
                    run for run in runs
                    if self._parse_run_timestamp(run) > since
                ]

            if status and runs:
                runs = [run for run in runs if run.get('status') == status]

            return runs

        except Exception as e:
            print(f"Error fetching profiling runs for task {task_id}: {e}")
            return []

    async def get_profiling_run_detail(self, run_id: str, task_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch detailed information about a specific profiling run including profiled fields.

        Uses: GET /profiling-service/api/v1/runDetail/{runId}

        Args:
            run_id: Profiling run identifier
            task_id: Task identifier (optional, for context)

        Returns:
            Run details dictionary with profiledFields array containing:
            - DATASOURCEFIELD entries (sourceName, fieldName, columnKey, precision, scale)
            - MAPPLETFIELD entries (frsId, ruleType, inputFieldMappings, outputFieldMappings)
        """
        endpoint = f"/profiling-service/api/v1/runDetail/{run_id}"

        try:
            response = await self._make_request(
                endpoint,
                context_task_id=task_id,
                context_run_id=run_id
            )
            return response

        except Exception as e:
            print(f"Error fetching run detail for {run_id}: {e}")
            return {}

    async def get_profiling_run_details(self, run_id: str, task_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch detailed information about a specific profiling run.

        Args:
            run_id: Profiling run identifier
            task_id: Task identifier (optional, for context)

        Returns:
            Run details dictionary
        """
        endpoint = f"/api/v2/profiling/runs/{run_id}"

        try:
            response = await self._make_request(
                endpoint,
                context_task_id=task_id,
                context_run_id=run_id
            )
            return response

        except Exception as e:
            print(f"Error fetching run details for {run_id}: {e}")
            return {}

    async def get_profiling_results(
        self,
        run_id: str,
        task_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch profiling results for a specific run.

        This returns both:
        - Table-level statistics (row count, etc.)
        - Column-level statistics (nulls, distinct values, min, max, avg, etc.)

        Args:
            run_id: Profiling run identifier
            task_id: Task identifier (optional, for context)

        Returns:
            Dictionary containing profiling results
        """
        # IDMC endpoint for profiling results
        # Common patterns:
        # - /api/v2/profiling/runs/{runId}/results
        # - /api/v2/profiling/runs/{runId}/statistics
        endpoint = f"/api/v2/profiling/runs/{run_id}/results"

        try:
            response = await self._make_request(
                endpoint,
                context_task_id=task_id,
                context_run_id=run_id
            )
            return response

        except Exception as e:
            print(f"Error fetching profiling results for run {run_id}: {e}")
            return {}

    async def get_column_statistics(
        self,
        profile_id: str,
        run_key: Optional[int] = None,
        column_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch column-level profiling statistics from metric-store.

        Uses: GET /metric-store/api/v1/odata/Profiles('{profileId}')/Columns

        This returns statistics for ALL runs, including historical data.
        Filter by runKey if you want a specific run.

        Args:
            profile_id: Profile UUID
            run_key: Specific run key (optional, filters results)
            column_name: Specific column name (optional, filters results)

        Returns:
            List of column statistics dictionaries with keys:
            - columnKey, columnName, columnId, columnType
            - profileKey, runKey, documentedDataType
            - totalRows, nulCount, nulPercent, distinctCount, distinctPercent
            - minimumValue, maximumValue, averageValue, standardDeviation
            - and many more statistics fields
        """
        endpoint = f"/metric-store/api/v1/odata/Profiles('{profile_id}')/Columns"

        # Build query parameters
        params = {
            "$orderby": "order,columnName,columnKey",
            "$skip": 0,
            "$top": 1000  # Get all columns
        }

        # Add runKey if specified - CRITICAL for getting correct data including MAPPLETFIELD
        if run_key is not None:
            params["runKey"] = run_key

        try:
            response = await self._make_request(
                endpoint,
                params=params,
                context_task_id=profile_id
            )

            # OData response format
            columns = response.get("value", response) if isinstance(response, dict) else response

            if not isinstance(columns, list):
                columns = [columns] if columns else []

            # Filter by column name if specified
            if column_name and columns:
                columns = [col for col in columns if col.get('columnName') == column_name]

            return columns

        except Exception as e:
            print(f"Error fetching column statistics for profile {profile_id}: {e}")
            return []

    async def get_column_patterns(
        self,
        profile_id: str,
        column_id: str,
        run_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch inferred data patterns for a column for a specific run.

        Uses: GET /metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/Patterns?runKey={runKey}

        Args:
            profile_id: Profile UUID
            column_id: Column UUID
            run_key: Run key to filter results (query parameter)

        Returns:
            List of pattern dictionaries with inferred types for the specific run
        """
        endpoint = f"/metric-store/api/v1/odata/Profiles('{profile_id}')/Columns('{column_id}')/Patterns"

        # Build query parameters - use runKey as query param, not OData $filter
        params = {}
        if run_key:
            params["runKey"] = run_key

        try:
            response = await self._make_request(
                endpoint,
                params=params,
                context_task_id=profile_id
            )

            # OData response format
            patterns = response.get("value", response) if isinstance(response, dict) else response

            if not isinstance(patterns, list):
                patterns = [patterns] if patterns else []

            return patterns

        except Exception as e:
            print(f"Error fetching patterns for column {column_id}, runKey={run_key}: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return []

    async def get_column_data_types(
        self,
        profile_id: str,
        column_id: str,
        run_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch documented and inferred data types for a column for a specific run.

        Uses: GET /metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/DataTypes?runKey={runKey}

        Args:
            profile_id: Profile UUID
            column_id: Column UUID
            run_key: Run key to filter results (query parameter)

        Returns:
            List of data type dictionaries with frequency and frequencyPercent for the specific run
        """
        endpoint = f"/metric-store/api/v1/odata/Profiles('{profile_id}')/Columns('{column_id}')/DataTypes"

        # Build query parameters - use runKey as query param, not OData $filter
        params = {}
        if run_key:
            params["runKey"] = run_key

        try:
            response = await self._make_request(
                endpoint,
                params=params,
                context_task_id=profile_id
            )

            # OData response format
            data_types = response.get("value", response) if isinstance(response, dict) else response

            if not isinstance(data_types, list):
                data_types = [data_types] if data_types else []

            return data_types

        except Exception as e:
            print(f"Error fetching data types for column {column_id}, runKey={run_key}: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return []

    async def get_column_value_frequencies(
        self,
        profile_id: str,
        column_id: str,
        run_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch top N most frequent values for a column for a specific run.

        Uses: GET /metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/ValueFrequencies?runKey={runKey}&$top=500&$orderby=frequency desc

        IMPORTANT: Unlike Patterns and DataTypes which use OData $filter, ValueFrequencies uses
        a simple query parameter: runKey=123 (not $filter=runKey eq 123)

        Args:
            profile_id: Profile UUID
            column_id: Column UUID
            run_key: Run key to filter results (query parameter, not OData filter)

        Returns:
            List of value frequency dictionaries sorted by frequency descending
        """
        endpoint = f"/metric-store/api/v1/odata/Profiles('{profile_id}')/Columns('{column_id}')/ValueFrequencies"

        # Build query parameters
        # NOTE: Start with minimal params - just runKey
        # The $top and $orderby might be causing 400 errors
        params = {}
        if run_key:
            params["runKey"] = run_key

        # TODO: Test if these OData params work - they might not be supported
        # params["$top"] = 500
        # params["$orderby"] = "frequency desc,columnValue asc"

        try:
            response = await self._make_request(
                endpoint,
                params=params,
                context_task_id=profile_id
            )

            # OData response format
            frequencies = response.get("value", response) if isinstance(response, dict) else response

            if not isinstance(frequencies, list):
                frequencies = [frequencies] if frequencies else []

            # Debug logging
            if len(frequencies) > 0:
                print(f"           API returned {len(frequencies)} value frequencies for column {column_id}, runKey={run_key}")
                print(f"           Sample VF keys: {list(frequencies[0].keys())}")
                # Check if API is actually filtering by runKey
                if len(frequencies) > 0 and 'runKey' in frequencies[0]:
                    unique_run_keys = set(f.get('runKey') for f in frequencies)
                    print(f"           WARNING: API returned data for {len(unique_run_keys)} different run keys: {unique_run_keys}")
                    if run_key and str(run_key) not in [str(rk) for rk in unique_run_keys]:
                        print(f"           ERROR: Requested runKey={run_key} but API returned different runs!")
                # Sample first record
                sample = frequencies[0]
                print(f"           Sample record: columnValue={sample.get('columnValue')}, frequency={sample.get('frequency')}, runKey={sample.get('runKey', 'N/A')}")
            else:
                print(f"           API returned 0 value frequencies for column {column_id}, runKey={run_key}")

            return frequencies

        except Exception as e:
            print(f"Error fetching value frequencies for column {column_id}, runKey={run_key}: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return []

    def _parse_run_timestamp(self, run: Dict[str, Any]) -> Optional[datetime]:
        """
        Parse run timestamp from API response.
        Handles various timestamp field names and formats.

        Args:
            run: Run dictionary from API

        Returns:
            Parsed datetime or None
        """
        # Try common timestamp field names
        timestamp_fields = ["startTime", "createdTime", "runStartTime", "executionTime", "createdAt", "timestamp"]

        for field in timestamp_fields:
            if field in run and run[field]:
                try:
                    # Try parsing ISO format
                    return datetime.fromisoformat(run[field].replace('Z', '+00:00'))
                except Exception:
                    try:
                        # Try parsing as Unix timestamp in seconds
                        return datetime.fromtimestamp(float(run[field]))
                    except Exception:
                        try:
                            # Try parsing as Unix timestamp in milliseconds (IDMC uses this)
                            return datetime.fromtimestamp(float(run[field]) / 1000.0)
                        except Exception:
                            continue

        return None

    async def trigger_profiling_run(self, task_id: str) -> Dict[str, Any]:
        """
        Trigger a new profiling run for a task.
        (Optional feature for manual execution)

        Args:
            task_id: Profiling task identifier

        Returns:
            Response containing new run information
        """
        endpoint = f"/api/v2/profiling/tasks/{task_id}/run"

        try:
            response = await self._make_request(
                endpoint,
                method="POST",
                context_task_id=task_id
            )
            return response

        except Exception as e:
            print(f"Error triggering profiling run for task {task_id}: {e}")
            return {"error": str(e)}

    async def get_rule_metadata(self, frs_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Fetch rule/mapplet metadata from FRS API.

        Uses: GET /frs/api/v1/Documents?$filter=id eq '{id}' or id eq '{id2}'...

        Args:
            frs_ids: List of FRS IDs to fetch

        Returns:
            List of rule metadata dictionaries with keys:
            - id, name, description, owner, createdBy, documentType
            - customAttributes (DIMENSION, EXCEPTION flags)
        """
        if not frs_ids:
            return []

        # Build filter query: id eq 'id1' or id eq 'id2' or...
        filter_parts = [f"id eq '{frs_id}'" for frs_id in frs_ids]
        filter_query = " or ".join(filter_parts)

        # URL encode the filter manually to avoid double encoding
        from urllib.parse import quote
        encoded_filter = quote(filter_query)

        endpoint = f"/frs/api/v1/Documents?$filter={encoded_filter}"
        params = None

        try:
            # FRS API uses a different base URL format: na1.dm-us.informaticacloud.com
            # Extract region from profiling URL (e.g., "na1" from na1-dqprofile.dm-us...)
            # or use "na1" as default
            base_url = self.auth.base_url

            # If base_url has region prefix, extract it
            # e.g., "https://dm-us.informaticacloud.com" -> use na1.dm-us
            if "dm-us.informaticacloud.com" in base_url:
                # Check if profiling_url has region
                if hasattr(self.auth, 'profiling_url') and self.auth.profiling_url:
                    if "na1-dqprofile" in self.auth.profiling_url:
                        base_url = "https://na1.dm-us.informaticacloud.com"
                    else:
                        # Extract region from profiling URL
                        import re
                        match = re.search(r'https://([^-]+)-', self.auth.profiling_url)
                        if match:
                            region = match.group(1)
                            base_url = f"https://{region}.dm-us.informaticacloud.com"

            full_url = f"{base_url}{endpoint}"

            # FRS API uses the same authentication as profiling-service API
            # Use IDS-SESSION-ID header like profiling APIs
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'IDS-SESSION-ID': self.auth.session_token
            }

            response = await self.client.get(
                full_url,
                headers=headers,
                params=params,
                follow_redirects=False  # Don't follow redirects to login page
            )

            response.raise_for_status()
            response_data = response.json()

            # OData response format
            documents = response_data.get("value", response_data) if isinstance(response_data, dict) else response_data

            if not isinstance(documents, list):
                documents = [documents] if documents else []

            return documents

        except Exception as e:
            print(f"Error fetching rule metadata for FRS IDs {frs_ids}: {e}")
            return []

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
