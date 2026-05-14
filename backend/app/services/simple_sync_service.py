"""
Simplified Sync Service using the WORKING API endpoints:
1. GET /profiling-service/api/v1/profile - List all profiles
2. GET /profiling-service/api/v1/profile/{id} - Get profile details
3. GET /profiling-service/api/v1/runDetail?profileId={id} - Get runs
4. GET /metric-store/api/v1/odata/Profiles('{id}')/Columns - Get statistics
"""
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime
from ..models import DimProfilingTask, DimProfilingRun, FactProfilingResult
from .auth_service import IDMCAuthService
from .profiling_service import ProfilingService


class SimpleSyncService:
    """Simplified sync service using working IDMC API endpoints."""

    def __init__(self, db: Session, auth_service: IDMCAuthService):
        self.db = db
        self.auth = auth_service
        self.profiling_service = ProfilingService(auth_service)

        self.stats = {
            "profiles_synced": 0,
            "runs_synced": 0,
            "statistics_synced": 0,
            "errors": 0
        }

    async def sync_all(self, incremental: bool = False) -> Dict[str, Any]:
        """
        Sync all profiling data from IDMC.

        Args:
            incremental: If True, only sync new data since last sync

        Returns:
            Dictionary with sync statistics
        """
        try:
            print("[SimpleSyncService] Starting sync...")

            # Step 1: Get all profiles
            print("[SimpleSyncService] Fetching profiles...")
            profiles = await self.profiling_service.get_all_profiles()
            print(f"[SimpleSyncService] Found {len(profiles)} profiles")

            # Step 2: Sync each profile
            for profile in profiles:
                try:
                    await self._sync_profile(profile, incremental)
                    self.stats["profiles_synced"] += 1
                except Exception as e:
                    print(f"[SimpleSyncService] Error syncing profile {profile.get('id')}: {e}")
                    self.stats["errors"] += 1

            print(f"[SimpleSyncService] Sync completed: {self.stats}")
            return {"success": True, "stats": self.stats}

        except Exception as e:
            print(f"[SimpleSyncService] Sync failed: {e}")
            return {"success": False, "error": str(e), "stats": self.stats}
        finally:
            await self.profiling_service.close()

    async def _sync_profile(self, profile: Dict[str, Any], incremental: bool):
        """Sync a single profile with its runs and statistics."""
        profile_id = profile['id']
        profile_key = profile.get('profileKey')

        print(f"[SimpleSyncService]   Syncing profile: {profile.get('name')} (key={profile_key})")

        # Step 1: Sync profile to dim_profiling_task
        task = await self._upsert_profiling_task(profile)

        # Step 2: Get profile runs
        runs = await self.profiling_service.get_profiling_runs(profile_id)
        print(f"[SimpleSyncService]     Found {len(runs)} runs")

        # Step 3: Sync each run
        for run in runs:
            try:
                await self._sync_run(run, task, profile_key)
                self.stats["runs_synced"] += 1
            except Exception as e:
                print(f"[SimpleSyncService]     Error syncing run {run.get('runKey')}: {e}")
                self.stats["errors"] += 1

        # Step 4: Get all column statistics (for all runs)
        try:
            statistics = await self.profiling_service.get_column_statistics(profile_id)
            print(f"[SimpleSyncService]     Found {len(statistics)} column statistics")

            # Sync statistics
            for stat in statistics:
                try:
                    await self._upsert_statistic(stat, task, profile_key)
                    self.stats["statistics_synced"] += 1
                except Exception as e:
                    print(f"[SimpleSyncService]     Error syncing statistic: {e}")
                    self.stats["errors"] += 1

        except Exception as e:
            print(f"[SimpleSyncService]     Error fetching statistics: {e}")
            self.stats["errors"] += 1

    async def _upsert_profiling_task(self, profile: Dict[str, Any]) -> DimProfilingTask:
        """Insert or update profiling task."""
        task_id = profile['id']

        # Check if exists
        task = self.db.query(DimProfilingTask).filter_by(profiling_task_id=task_id).first()

        if task:
            # Update existing
            task.task_name = profile.get('name')
            task.profile_key = profile.get('profileKey')
            task.frs_id = profile.get('frsId')
            task.project_id = profile.get('frsProjectId')
            task.folder_id = profile.get('frsFolderId')
            task.connection_id = profile.get('connectionId')
            task.created_by = profile.get('createdByName')
            task.profile_type = profile.get('profileType')
            task.version = profile.get('version')
            task.last_synced_at = datetime.utcnow()
        else:
            # Create new
            task = DimProfilingTask(
                profiling_task_id=task_id,
                profile_key=profile.get('profileKey'),
                task_name=profile.get('name'),
                frs_id=profile.get('frsId'),
                project_id=profile.get('frsProjectId'),
                folder_id=profile.get('frsFolderId'),
                connection_id=profile.get('connectionId'),
                created_by=profile.get('createdByName'),
                created_at=self._parse_timestamp(profile.get('createTime')),
                profile_type=profile.get('profileType'),
                version=profile.get('version'),
                first_synced_at=datetime.utcnow(),
                last_synced_at=datetime.utcnow(),
                is_active=1
            )
            self.db.add(task)

        self.db.commit()
        return task

    async def _sync_run(self, run: Dict[str, Any], task: DimProfilingTask, profile_key: int):
        """Sync a profiling run."""
        run_id = run['id']
        run_key = run.get('runKey')

        # Check if exists
        existing_run = self.db.query(DimProfilingRun).filter_by(profiling_run_id=run_id).first()

        if existing_run:
            # Update existing
            existing_run.run_status = run.get('status')
            existing_run.run_end_time = self._parse_timestamp(run.get('endTime'))
            existing_run.execution_time_seconds = run.get('executionTime', 0) / 1000.0  # Convert ms to seconds
            existing_run.rows_processed = run.get('rowsProcessed')
        else:
            # Create new
            new_run = DimProfilingRun(
                profiling_run_id=run_id,
                run_key=run_key,
                profiling_task_id=task.profiling_task_id,
                run_status=run.get('status'),
                run_start_time=self._parse_timestamp(run.get('startTime')),
                run_end_time=self._parse_timestamp(run.get('endTime')),
                execution_time_seconds=run.get('executionTime', 0) / 1000.0,
                rows_processed=run.get('rowsProcessed'),
                created_by=run.get('createdByName'),
                sampling_type=run.get('samplingType'),
                sampling_rows=run.get('samplingRows')
            )
            self.db.add(new_run)

        self.db.commit()

    async def _upsert_statistic(self, stat: Dict[str, Any], task: DimProfilingTask, profile_key: int):
        """Insert or update column statistic."""
        column_key = stat.get('columnKey')
        run_key = stat.get('runKey')

        # Check if exists
        existing = self.db.query(FactProfilingResult).filter_by(
            profile_key=profile_key,
            run_key=run_key,
            column_key=column_key
        ).first()

        if existing:
            # Update existing statistics
            self._update_statistic_fields(existing, stat)
        else:
            # Create new
            new_stat = FactProfilingResult(
                profiling_task_id=task.profiling_task_id,
                profile_key=profile_key,
                run_key=run_key,
                column_key=column_key,
                column_name=stat.get('columnName'),
                column_id=stat.get('columnId'),
                data_type=stat.get('documentedDataType'),
                synced_at=datetime.utcnow()
            )
            self._update_statistic_fields(new_stat, stat)
            self.db.add(new_stat)

        self.db.commit()

    def _update_statistic_fields(self, record: FactProfilingResult, stat: Dict[str, Any]):
        """Update all statistic fields on a record."""
        record.total_rows = stat.get('totalRows')
        record.null_count = stat.get('nulCount')
        record.null_percent = stat.get('nulPercent')
        record.blank_count = stat.get('blankCount')
        record.blank_percent = stat.get('blankPercent')
        record.zero_count = stat.get('zeroCount')
        record.zero_percent = stat.get('zeroPercent')
        record.distinct_count = stat.get('distinctCount')
        record.distinct_percent = stat.get('distinctPercent')
        record.duplicate_count = stat.get('duplicateCount')
        record.duplicate_percent = stat.get('duplicatePercent')
        record.min_value = stat.get('minimumValue')
        record.max_value = stat.get('maximumValue')
        record.min_length = stat.get('minimumLength')
        record.max_length = stat.get('maximumLength')
        record.avg_value = self._safe_float(stat.get('averageValue'))
        record.std_deviation = self._safe_float(stat.get('standardDeviation'))
        record.total_sum = self._safe_float(stat.get('totalSum'))
        record.total_patterns = stat.get('totalPatterns')
        record.top_pattern_percent = stat.get('topPatternPercent')
        record.contains_line_feeds = stat.get('containLineFeeds')
        record.contains_lead_trail_spaces = stat.get('containLeadTrailSpaces')
        record.is_value_freq_outlier = stat.get('isValueFreqOutlier')
        record.is_pattern_outlier = stat.get('isPatternOutlier')
        record.synced_at = datetime.utcnow()

    def _parse_timestamp(self, timestamp: Any) -> datetime:
        """Parse timestamp from API (epoch milliseconds)."""
        if not timestamp:
            return None
        try:
            # IDMC returns epoch milliseconds
            return datetime.fromtimestamp(float(timestamp) / 1000.0)
        except:
            return None

    def _safe_float(self, value: Any) -> float:
        """Safely convert to float."""
        if value is None:
            return None
        try:
            return float(value)
        except:
            return None
