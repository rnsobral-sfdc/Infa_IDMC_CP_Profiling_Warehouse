"""
Star Schema Sync Service - Production Ready
Maps IDMC API data to the existing star schema database structure.

Star Schema Tables:
- dim_dq_asset: Assets/objects being profiled
- dim_profiling_task: Profiling task configurations
- dim_profiling_run: Profiling execution runs
- dim_column: Column metadata
- dim_time: Time dimension
- fact_profiling_result: Profiling statistics (metric_type/metric_value format)
"""
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from ..models import (
    DimDQAsset, DimProfilingTask, DimProfilingRun, DimColumn,
    DimTime, FactProfilingResult, FactColumnPattern,
    FactColumnDataType, FactColumnValueFrequency,
    DimDataSourceField, DimRuleMapplet, FactRuleInputMapping,
    FactRuleOutputMapping, DimRuleOccurrence, DimConnection
)
from .auth_service import IDMCAuthService
from .profiling_service import ProfilingService
from .profile_service import ProfileService
from .connection_detail_service import ConnectionDetailService
from .rule_occurrence_service import RuleOccurrenceService


class StarSchemaSyncService:
    """Production sync service using proper star schema."""

    def __init__(self, db: Session, auth_service: IDMCAuthService, sync_run_id: Optional[int] = None):
        self.db = db
        self.auth = auth_service
        self.profiling_service = ProfilingService(auth_service)
        # Initialize ProfileService (will use session token when we call it after login)
        self.profile_service = None
        self.connection_service = None
        self.rule_occurrence_service = None
        self.sync_run_id = sync_run_id  # For progress tracking
        self._profile_objects_loaded = False  # Track if we've loaded profile objects
        self.org_id = None  # Will be set from auth service

        self.stats = {
            "profiles_synced": 0,
            "runs_synced": 0,
            "statistics_synced": 0,
            "errors": 0,
            "start_time": None,
            "end_time": None,
            "total_profiles": 0,
            "connections_synced": 0,
            "data_source_fields_synced": 0,
            "rule_mapplets_synced": 0,
            "rule_occurrences_synced": 0
        }

    def _check_stop_requested(self) -> bool:
        """Check if stop has been requested for this sync run."""
        if not self.sync_run_id:
            return False

        from ..models import SyncJobRun
        run = self.db.query(SyncJobRun).filter(SyncJobRun.id == self.sync_run_id).first()
        return run and run.stop_requested == 1

    def _save_checkpoint(self, current_profile_id: str, profile_index: int):
        """Save checkpoint data for resume."""
        if not self.sync_run_id:
            return

        import json
        from ..models import SyncJobRun

        checkpoint = {
            "profile_index": profile_index,
            "profile_id": current_profile_id,
            "timestamp": datetime.utcnow().isoformat()
        }

        run = self.db.query(SyncJobRun).filter(SyncJobRun.id == self.sync_run_id).first()
        if run:
            run.checkpoint_data = json.dumps(checkpoint)
            run.last_processed_profile_id = current_profile_id
            self.db.commit()

    async def sync_all(self, incremental: bool = False, task_limit: Optional[int] = None, max_runs_per_task: Optional[int] = 5, checkpoint: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Sync all profiling data from IDMC to star schema.

        Args:
            incremental: If True, only sync new/updated data since last sync
            task_limit: Optional limit on number of tasks to import (None = all, 10, 100, etc.)
            max_runs_per_task: Max profiling runs per task (1, 3, 10, or None for all). Default: 5
            checkpoint: Resume checkpoint data (dict with profile_index, profile_id)

        Returns:
            Dictionary with sync statistics including 'stopped' flag if stop was requested
        """
        self.stats["start_time"] = datetime.utcnow()

        try:
            print("\n" + "="*70)
            print(" Star Schema Sync Service - Production Mode")
            print("="*70)
            print(f"Start Time: {self.stats['start_time']}")
            print(f"Mode: {'Incremental (Delta Only)' if incremental else 'Full Sync'}")
            print(f"Task Limit: {task_limit if task_limit else 'All'}")
            print(f"Max Runs/Task: {max_runs_per_task if max_runs_per_task else 'All'}")
            if checkpoint:
                print(f"Resume: From profile index {checkpoint.get('profile_index', 0)}")
            print("="*70 + "\n")

            # Ensure authentication before starting
            print("[Authentication] Checking IDMC session...")
            await self.auth.ensure_authenticated()
            print(f"                 ✓ Connected to IDMC (Org: {self.auth.org_name})")
            print()

            # Step 1: Get all profiles from IDMC
            print("[Step 1/4] Fetching profiles from IDMC...")
            profiles = await self.profiling_service.get_all_profiles()

            # Apply task limit if specified
            if task_limit and task_limit > 0:
                profiles = profiles[:task_limit]
                print(f"           Found {len(profiles)} profiles (limited to {task_limit})")
            else:
                print(f"           Found {len(profiles)} profiles")

            # Apply checkpoint if resuming
            start_index = 0
            if checkpoint:
                start_index = checkpoint.get('profile_index', 0)
                if start_index > 0:
                    print(f"           Resuming from profile {start_index}/{len(profiles)}")
                    profiles = profiles[start_index:]

            self.stats["total_profiles"] = len(profiles)
            print()

            # Step 1.5: Get org_id from auth service
            self.org_id = getattr(self.auth, 'org_id', None)
            if self.org_id:
                print(f"           Organization ID: {self.org_id}")
            else:
                print(f"           WARNING: No org_id found in auth service")

            # Step 1.5: Initialize ProfileService and fetch all profile objects (for path lookups)
            print("[Step 2/4] Fetching profile objects for path resolution...")
            # Initialize ProfileService with authenticated session token
            self.profile_service = ProfileService(self.auth.base_url, self.auth.session_token)
            await self.profile_service.fetch_all_profile_objects()
            self._profile_objects_loaded = True
            print(f"           Loaded profile objects cache")

            # Initialize other services
            self.connection_service = ConnectionDetailService(self.auth.base_url, self.auth.session_token)
            self.rule_occurrence_service = RuleOccurrenceService(self.auth.profiling_url, self.auth.session_token)
            print()

            # Update initial progress with total count
            if self.sync_run_id:
                self._update_run_progress()

            # Step 3: Sync each profile
            print(f"[Step 3/4] Syncing {len(profiles)} profiles...")
            for idx, profile in enumerate(profiles, 1):
                try:
                    # Check for stop signal
                    if self._check_stop_requested():
                        print(f"\n[STOP REQUESTED] Stopping sync at profile {start_index + idx}/{start_index + len(profiles)}")
                        print(f"           Checkpoint saved. Use resume to continue.")
                        return {"success": True, "stopped": True, "stats": self.stats}

                    actual_idx = start_index + idx
                    if idx % 10 == 0:
                        print(f"           Progress: {actual_idx}/{start_index + len(profiles)} profiles...")

                    await self._sync_profile(profile, incremental, max_runs_per_task)
                    self.stats["profiles_synced"] += 1

                    # Save checkpoint after each profile
                    if self.sync_run_id:
                        self._save_checkpoint(profile.get('id'), actual_idx)
                        self._update_run_progress()

                except Exception as e:
                    print(f"           ERROR syncing profile {profile.get('name', 'unknown')}: {e}")
                    self.stats["errors"] += 1

            # Step 4: Summary
            self.stats["end_time"] = datetime.utcnow()
            duration = (self.stats["end_time"] - self.stats["start_time"]).total_seconds()

            # Final progress update
            if self.sync_run_id:
                self._update_run_progress()

            print("\n" + "="*70)
            print(" SYNC COMPLETED")
            print("="*70)
            print(f"Duration:           {duration:.1f} seconds")
            print(f"Profiles synced:    {self.stats['profiles_synced']}")
            print(f"Runs synced:        {self.stats['runs_synced']}")
            print(f"Statistics synced:  {self.stats['statistics_synced']}")
            print(f"Errors:             {self.stats['errors']}")
            print("="*70 + "\n")

            return {"success": True, "stats": self.stats}

        except Exception as e:
            print(f"\n[FATAL ERROR] Sync failed: {e}")
            import traceback
            traceback.print_exc()

            # Provide user-friendly error message for common errors
            error_msg = str(e)
            if "ReadTimeout" in str(type(e).__name__) or "timeout" in str(e).lower():
                error_msg = (
                    f"IDMC API timeout error: The request took longer than the timeout limit.\n\n"
                    f"This typically happens when:\n"
                    f"1. The IDMC server is slow or overloaded\n"
                    f"2. You have a very large number of projects/profiles\n"
                    f"3. Network connectivity is slow\n\n"
                    f"Suggestions:\n"
                    f"- Try again later when IDMC load is lower\n"
                    f"- Consider reducing the task_limit to sync fewer profiles\n"
                    f"- Check your network connection\n\n"
                    f"Technical details: {error_msg}"
                )

            return {"success": False, "error": error_msg, "stats": self.stats}
        finally:
            await self.profiling_service.close()

    async def _sync_profile(self, profile: Dict[str, Any], incremental: bool, max_runs_per_task: Optional[int] = 5):
        """Sync a single profile with all its data."""
        profile_id = profile['id']
        profile_name = profile.get('name', 'Unknown')

        try:
            # Step 1: Get or create DQ Asset
            dq_asset = await self._upsert_dq_asset(profile)

            # Step 2: Get or create Profiling Task
            profiling_task = self._upsert_profiling_task(profile, dq_asset.dq_asset_id)

            # Step 3: Get runs from IDMC
            runs = await self.profiling_service.get_profiling_runs(profile_id)

            if not runs:
                return  # No runs to process

            # Step 3.5: Apply max_runs_per_task limit and incremental filtering
            if max_runs_per_task and max_runs_per_task > 0:
                # Sort by runKey descending to get latest runs first
                runs = sorted(runs, key=lambda r: int(r.get('runKey', 0)), reverse=True)
                runs = runs[:max_runs_per_task]
                print(f"           Limited to {len(runs)} most recent runs")

            # Step 3.6: If incremental, filter out already-synced runs
            if incremental:
                existing_run_ids = set(
                    r[0] for r in self.db.query(DimProfilingRun.profiling_run_id).filter(
                        DimProfilingRun.profiling_task_id == profiling_task.profiling_task_id
                    ).all()
                )
                new_runs = [r for r in runs if r.get('id') not in existing_run_ids]
                if len(new_runs) < len(runs):
                    print(f"           Incremental: {len(new_runs)} new runs (skipped {len(runs) - len(new_runs)} existing)")
                runs = new_runs

            if not runs:
                return  # No new runs to process

            # Step 4: Sync each run with its statistics
            for run in runs:
                try:
                    run_key = run.get('runKey')

                    # Sync run metadata
                    await self._sync_run(run, profiling_task, dq_asset)
                    self.stats["runs_synced"] += 1

                    # Step 5: Get statistics for THIS SPECIFIC RUN
                    # CRITICAL: Must pass runKey to get correct data including MAPPLETFIELD
                    statistics = await self.profiling_service.get_column_statistics(profile_id, run_key=run_key)

                    if statistics:
                        # Sync statistics for this run
                        await self._sync_statistics(statistics, profiling_task, dq_asset, [run])

                        # Step 6: Sync enhanced profiling data (patterns, data types, value frequencies)
                        print(f"           Syncing enhanced profiling data...")
                        await self._sync_enhanced_profiling_data(statistics, profiling_task, [run])

                        # Step 7: Backfill inferred data types from enhanced data to data source fields
                        await self._backfill_inferred_types(run.get('id'))

                except Exception as e:
                    print(f"           ERROR syncing run {run_key}: {e}")
                    self.db.rollback()  # Rollback on run error
                    self.stats["errors"] += 1

        except Exception as e:
            # Rollback the entire profile sync on error
            self.db.rollback()
            raise e

    async def _upsert_dq_asset(self, profile: Dict[str, Any]) -> DimDQAsset:
        """Create or update DQ Asset using ProfileService for path resolution."""
        # Use profile ID as asset ID (profiles are assets in this context)
        asset_id = profile['id']

        # Get IDs from profile
        frs_id = profile.get('frsId', '')
        frs_project_id = profile.get('frsProjectId', '')
        frs_folder_id = profile.get('frsFolderId', '')

        # Initialize default values
        object_name = profile.get('name', 'Unknown')
        project_display_name = "Unknown Project"
        folder_display_name = ""
        full_path = f"Unknown/{object_name}"

        # Use ProfileService to lookup project path
        # The Objects API with type=='Project' returns the full path in the 'path' field
        if self._profile_objects_loaded and frs_project_id:
            try:
                # Lookup project path using frsProjectId
                # This returns the full path from the 'path' field (e.g., 'CDQ_Demo_2021', '_RNS_Demos')
                project_path = self.profile_service.get_project_path(frs_project_id)
                if project_path:
                    # The path field contains the full project path
                    # Parse it to extract project and folder names
                    path_parts = [p for p in project_path.split('/') if p]

                    if len(path_parts) >= 1:
                        project_display_name = path_parts[0]

                        # If there are more parts, they form the folder path
                        if len(path_parts) > 1:
                            folder_display_name = '/'.join(path_parts[1:])

                    # Construct full path with profile name
                    if folder_display_name:
                        full_path = f"{project_display_name}/{folder_display_name}/{object_name}"
                    else:
                        full_path = f"{project_display_name}/{object_name}"
                else:
                    print(f"           WARNING: No project found for frsProjectId={frs_project_id}, profile={object_name}")

            except Exception as e:
                print(f"           WARNING: Failed to resolve path for profile {object_name}: {e}")

        # For backward compatibility, also store in project_name/folder_path fields
        # (These can be removed in a future schema simplification)
        project_name = project_display_name
        folder_path = folder_display_name

        # Sync connection details if available
        connection_id = profile.get('connectionId')
        connection_name = None
        connection_type = None

        if connection_id:
            await self._sync_connection_details(connection_id)
            # Look up connection in database
            connection = self.db.query(DimConnection).filter_by(connection_id=connection_id).first()
            if connection:
                connection_name = connection.connection_name
                connection_type = connection.connection_type

        # Check if exists by ID first, then by full_path
        asset = self.db.query(DimDQAsset).filter_by(dq_asset_id=asset_id).first()

        if not asset:
            # Check by full_path (in case it exists with different ID)
            asset = self.db.query(DimDQAsset).filter_by(full_path=full_path).first()

        if asset:
            # Update existing asset
            asset.dq_asset_id = asset_id  # Update ID in case found by path
            asset.org_id = self.org_id
            asset.object_name = object_name
            asset.full_path = full_path
            asset.project_name = project_name
            asset.folder_path = folder_path
            asset.project_id = frs_project_id  # Store frsProjectId
            asset.project_display_name = project_display_name
            asset.folder_id = frs_folder_id  # Store frsFolderId
            asset.folder_display_name = folder_display_name
            asset.connection_id = connection_id
            asset.connection_name = connection_name
            asset.connection_type = connection_type
            asset.updated_at = datetime.utcnow()
        else:
            # Create new asset
            asset = DimDQAsset(
                dq_asset_id=asset_id,
                org_id=self.org_id,
                project_name=project_name,
                project_id=frs_project_id,  # Store frsProjectId
                project_display_name=project_display_name,
                folder_path=folder_path,
                folder_id=frs_folder_id,  # Store frsFolderId
                folder_display_name=folder_display_name,
                object_name=object_name,
                full_path=full_path,
                asset_type='PROFILING_TASK',
                connection_id=connection_id,
                connection_name=connection_name,
                connection_type=connection_type,
                created_by=profile.get('createdByName'),
                created_at=self._parse_timestamp(profile.get('createTime')),
                updated_at=datetime.utcnow()
            )
            self.db.add(asset)

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            # If commit fails, try to find existing by full_path and return it
            asset = self.db.query(DimDQAsset).filter_by(full_path=full_path).first()
            if not asset:
                raise e

        return asset

    def _upsert_profiling_task(self, profile: Dict[str, Any], dq_asset_id: str) -> DimProfilingTask:
        """Create or update Profiling Task with project/folder info."""
        task_id = profile['id']

        # Get IDs from profile
        frs_id = profile.get('frsId', '')
        frs_project_id = profile.get('frsProjectId', '')
        frs_folder_id = profile.get('frsFolderId', '')

        # Get project/folder display names
        project_name = ""
        project_display_name = ""
        folder_path = ""
        folder_display_name = ""
        full_path = profile.get('name', 'Unknown')

        if self._profile_objects_loaded and frs_project_id:
            try:
                project_path = self.profile_service.get_project_path(frs_project_id)
                if project_path:
                    path_parts = [p for p in project_path.split('/') if p]
                    if len(path_parts) >= 1:
                        project_name = path_parts[0]
                        project_display_name = path_parts[0]
                        if len(path_parts) > 1:
                            folder_path = '/'.join(path_parts[1:])
                            folder_display_name = '/'.join(path_parts[1:])

                    # Construct full path
                    if folder_display_name:
                        full_path = f"{project_display_name}/{folder_display_name}/{profile.get('name', 'Unknown')}"
                    else:
                        full_path = f"{project_display_name}/{profile.get('name', 'Unknown')}"
            except Exception as e:
                print(f"           WARNING: Failed to resolve path for task {profile.get('name')}: {e}")

        # Check if exists
        task = self.db.query(DimProfilingTask).filter_by(profiling_task_id=task_id).first()

        if task:
            # Update
            task.org_id = self.org_id
            task.profiling_name = profile.get('name')
            task.profiling_type = profile.get('profileType')
            task.frs_id = frs_id
            task.project_name = project_name
            task.project_id = frs_project_id
            task.project_display_name = project_display_name
            task.folder_path = folder_path
            task.folder_id = frs_folder_id
            task.folder_display_name = folder_display_name
            task.full_path = full_path
            task.updated_at = datetime.utcnow()
        else:
            # Create
            task = DimProfilingTask(
                profiling_task_id=task_id,
                dq_asset_id=dq_asset_id,
                org_id=self.org_id,
                profiling_name=profile.get('name', 'Unknown'),
                profiling_type=profile.get('profileType'),
                frs_id=frs_id,
                project_name=project_name,
                project_id=frs_project_id,
                project_display_name=project_display_name,
                folder_path=folder_path,
                folder_id=frs_folder_id,
                folder_display_name=folder_display_name,
                full_path=full_path,
                created_by=profile.get('createdByName'),
                created_at=self._parse_timestamp(profile.get('createTime')),
                is_active=1
            )
            self.db.add(task)

        self.db.commit()
        return task

    async def _sync_run(self, run: Dict[str, Any], task: DimProfilingTask, asset: DimDQAsset):
        """Sync a profiling run with enhanced runDetail data."""
        run_id = run['id']

        # Check if exists
        existing_run = self.db.query(DimProfilingRun).filter_by(profiling_run_id=run_id).first()

        # Fetch runDetail for enhanced metadata
        run_detail = await self.profiling_service.get_profiling_run_detail(run_id, task.profiling_task_id)

        if not existing_run:
            # Calculate duration if we have both start and end times
            duration_seconds = None
            start_time = self._parse_timestamp(run.get('startTime'))
            end_time = self._parse_timestamp(run.get('endTime'))
            if start_time and end_time:
                duration_seconds = int((end_time - start_time).total_seconds())

            # Create new run with enhanced fields from runDetail
            new_run = DimProfilingRun(
                profiling_run_id=run_id,
                org_id=self.org_id,
                profiling_task_id=task.profiling_task_id,
                run_key=str(run.get('runKey', '')),
                job_id=run_detail.get('jobId'),
                run_status=run.get('status', 'UNKNOWN'),
                run_detail_status=run_detail.get('status'),
                start_time=run_detail.get('startTime'),
                end_time=run_detail.get('endTime'),
                execution_time_ms=run_detail.get('executionTimeMs'),
                run_start_time=start_time,
                run_end_time=end_time,
                run_duration_seconds=duration_seconds,
                # Sampling info from runDetail
                sampling_type=run_detail.get('samplingType'),
                sampling_rows=run_detail.get('samplingRows'),
                is_filter_enabled=run_detail.get('isFilterEnabled', False),
                filter_name=run_detail.get('filterName'),
                # Row counts
                rows_processed=run.get('rowsProcessed'),
                row_count=run.get('rowsProcessed'),
                # Coverage statistics from runDetail
                number_of_ds_columns=run_detail.get('numberOfDSColumns'),
                number_of_rules=run_detail.get('numberOfRules'),
                number_of_mapplet_columns=run_detail.get('numberOfMappletColumns'),
                number_of_columns=run_detail.get('numberOfColumns'),
                # Cost tracking
                run_cost_mb=run_detail.get('runCostMb'),
                # Detection settings
                is_detect_outlier=run_detail.get('isDetectOutlier', True),
                # User info from runDetail
                created_by=run_detail.get('createdBy'),
                created_by_name=run_detail.get('createdByName') or run.get('createdByName'),
                created_time=run_detail.get('createdTime'),
                created_at=self._parse_timestamp(run.get('createdTime'))
            )
            self.db.add(new_run)
            self.db.commit()
        else:
            # Update existing run with runDetail data if available
            if run_detail:
                existing_run.job_id = run_detail.get('jobId')
                existing_run.run_detail_status = run_detail.get('status')
                existing_run.start_time = run_detail.get('startTime')
                existing_run.end_time = run_detail.get('endTime')
                existing_run.execution_time_ms = run_detail.get('executionTimeMs')
                existing_run.sampling_type = run_detail.get('samplingType')
                existing_run.sampling_rows = run_detail.get('samplingRows')
                existing_run.is_filter_enabled = run_detail.get('isFilterEnabled', False)
                existing_run.filter_name = run_detail.get('filterName')
                existing_run.number_of_ds_columns = run_detail.get('numberOfDSColumns')
                existing_run.number_of_rules = run_detail.get('numberOfRules')
                existing_run.number_of_mapplet_columns = run_detail.get('numberOfMappletColumns')
                existing_run.number_of_columns = run_detail.get('numberOfColumns')
                existing_run.run_cost_mb = run_detail.get('runCostMb')
                existing_run.is_detect_outlier = run_detail.get('isDetectOutlier', True)
                existing_run.created_by = run_detail.get('createdBy')
                existing_run.created_by_name = run_detail.get('createdByName') or existing_run.created_by_name
                existing_run.created_time = run_detail.get('createdTime')
                self.db.commit()

        # Sync profiled fields (data source fields and rule mapplets)
        if run_detail and run_detail.get('profiledFields'):
            profiled_fields = run_detail['profiledFields']
            mapplet_count = len([f for f in profiled_fields if f.get('fieldType') == 'MAPPLETFIELD'])
            print(f"           Syncing {len(profiled_fields)} profiled fields ({mapplet_count} MAPPLETFIELD) for run {run_id[:30]}...")
            await self._sync_profiled_fields(profiled_fields, task, run_id)
        else:
            print(f"           WARNING: No profiledFields found for run {run_id[:30]}")

    async def _sync_statistics(
        self,
        statistics: List[Dict[str, Any]],
        task: DimProfilingTask,
        asset: DimDQAsset,
        runs: List[Dict[str, Any]]
    ):
        """Sync column statistics to fact table."""

        # Create run_key to run_id mapping
        run_map = {run.get('runKey'): run.get('id') for run in runs}

        # Group stats by column and run for efficient processing
        for stat in statistics:
            try:
                run_key = stat.get('runKey')
                run_id = run_map.get(run_key)

                if not run_id:
                    continue  # Skip if run not found

                column_name = stat.get('columnName')
                column_type = stat.get('columnType', 'DATASOURCEFIELD')
                column_id_external = stat.get('columnId')
                documented_data_type = stat.get('documentedDataType')
                column_key = stat.get('columnKey')

                # Link to data source field or rule output mapping based on column type
                data_source_field_id = None
                rule_output_mapping_id = None

                if column_type == 'DATASOURCEFIELD' and column_id_external:
                    # Find matching data source field by field_id AND run_id
                    ds_field = self.db.query(DimDataSourceField).filter_by(
                        field_id=column_id_external,
                        profiling_run_id=run_id
                    ).first()
                    if ds_field:
                        data_source_field_id = ds_field.field_id

                elif column_type == 'MAPPLETFIELD' and column_key:
                    # Find matching rule output mapping by column key AND run_id
                    # Column keys can be reused across profiles, so we must filter by run
                    print(f"           DEBUG: Processing MAPPLETFIELD '{column_name}' with column_key={column_key}")
                    output_mapping = self.db.query(FactRuleOutputMapping).filter_by(
                        column_key=column_key,
                        profiling_run_id=run_id
                    ).first()
                    if output_mapping:
                        rule_output_mapping_id = output_mapping.mapping_id
                        print(f"           DEBUG: Linked to mapping_id={rule_output_mapping_id[:20]}...")
                    else:
                        print(f"           DEBUG: NO MATCHING OUTPUT MAPPING FOUND for column_key={column_key}")

                # NOTE: Inferred patterns/types will be populated later by _sync_enhanced_profiling_data
                # We don't fetch them here to avoid duplicate API calls
                inferred_patterns = None
                inferred_data_type = None

                # Get or create column dimension
                column = self._get_or_create_column(column_name, documented_data_type)

                # Get run timestamp for time dimension
                run_timestamp = None
                for run in runs:
                    if run.get('runKey') == run_key:
                        run_timestamp = self._parse_timestamp(run.get('startTime'))
                        break

                if not run_timestamp:
                    run_timestamp = datetime.utcnow()

                # Get or create time dimension
                time_id = self._get_or_create_time(run_timestamp)

                # Transform statistics into metric rows
                metrics = self._transform_statistics_to_metrics(stat)

                # Insert each metric with enhanced metadata
                for metric_type, metric_value in metrics.items():
                    self._upsert_metric(
                        run_id=run_id,
                        task_id=task.profiling_task_id,
                        asset_id=asset.dq_asset_id,
                        column_id=column.column_id,
                        time_id=time_id,
                        column_name=column_name,
                        metric_type=metric_type,
                        metric_value=metric_value,
                        run_timestamp=run_timestamp,
                        column_type=column_type,
                        column_id_external=column_id_external,
                        documented_data_type=documented_data_type,
                        inferred_data_type=inferred_data_type,
                        inferred_patterns=inferred_patterns,
                        data_source_field_id=data_source_field_id,
                        rule_output_mapping_id=rule_output_mapping_id,
                        column_key=column_key
                    )
                    self.stats["statistics_synced"] += 1

                # Log MAPPLETFIELD sync
                if column_type == 'MAPPLETFIELD':
                    print(f"           DEBUG: Stored {len(metrics)} metrics for MAPPLETFIELD '{column_name}' with rule_output_mapping_id={rule_output_mapping_id}")

            except Exception as e:
                print(f"           ERROR syncing statistic for column {stat.get('columnName')}: {e}")
                self.stats["errors"] += 1

        self.db.commit()

    async def _sync_enhanced_profiling_data(
        self,
        statistics: List[Dict[str, Any]],
        task: DimProfilingTask,
        runs: List[Dict[str, Any]]
    ):
        """
        Sync enhanced profiling data: patterns, data types, and value frequencies.

        NOTE: The IDMC metric-store APIs return cumulative data across ALL runs,
        not per-run data. Therefore, we only store the LATEST snapshot, not historical.
        """

        # Get the most recent run
        if not runs:
            return

        latest_run = max(runs, key=lambda r: r.get('runKey', 0))
        run_id = latest_run.get('id')
        run_key = latest_run.get('runKey')

        print(f"           Syncing enhanced data for latest run (key: {run_key})...")

        # Delete existing enhanced data for THIS RUN (since APIs return cumulative data)
        # We delete by run_id because the frontend queries by run_id
        if run_id:
            try:
                patterns_deleted = self.db.query(FactColumnPattern).filter(
                    FactColumnPattern.profiling_run_id == run_id
                ).delete(synchronize_session=False)

                datatypes_deleted = self.db.query(FactColumnDataType).filter(
                    FactColumnDataType.profiling_run_id == run_id
                ).delete(synchronize_session=False)

                frequencies_deleted = self.db.query(FactColumnValueFrequency).filter(
                    FactColumnValueFrequency.profiling_run_id == run_id
                ).delete(synchronize_session=False)

                self.db.commit()
                print(f"           Cleared existing enhanced data for run {run_key} (patterns: {patterns_deleted}, datatypes: {datatypes_deleted}, frequencies: {frequencies_deleted})")
            except Exception as e:
                print(f"           WARNING: Could not clear existing enhanced data: {e}")
                self.db.rollback()

        # Get unique columns from the latest run's statistics only
        columns_processed = set()
        latest_run_stats = [s for s in statistics if s.get('runKey') == run_key]

        # Build list of unique columns to process
        columns_to_process = []
        for stat in latest_run_stats:
            column_name = stat.get('columnName')
            column_id_external = stat.get('columnId')

            if not column_id_external or not task.profiling_task_id:
                continue

            # Skip if already processed this column
            if column_id_external in columns_processed:
                continue
            columns_processed.add(column_id_external)

            columns_to_process.append({
                'column_name': column_name,
                'column_id': column_id_external
            })

        if not columns_to_process:
            return

        # Get run timestamp from the latest run
        run_timestamp = self._parse_timestamp(latest_run.get('startTime'))
        if not run_timestamp:
            run_timestamp = datetime.utcnow()

        print(f"           Fetching enhanced data for {len(columns_to_process)} columns in parallel...")

        # OPTIMIZATION: Fetch all columns' data in parallel using asyncio.gather()
        import asyncio

        # Build tasks for all columns
        pattern_tasks = []
        datatype_tasks = []
        frequency_tasks = []

        for col in columns_to_process:
            pattern_tasks.append(self.profiling_service.get_column_patterns(
                task.profiling_task_id,
                col['column_id'],
                run_key
            ))
            datatype_tasks.append(self.profiling_service.get_column_data_types(
                task.profiling_task_id,
                col['column_id'],
                run_key
            ))
            frequency_tasks.append(self.profiling_service.get_column_value_frequencies(
                task.profiling_task_id,
                col['column_id'],
                run_key
            ))

        # Execute all API calls in parallel
        try:
            all_patterns, all_datatypes, all_frequencies = await asyncio.gather(
                asyncio.gather(*pattern_tasks, return_exceptions=True),
                asyncio.gather(*datatype_tasks, return_exceptions=True),
                asyncio.gather(*frequency_tasks, return_exceptions=True)
            )

            print(f"           Completed parallel API calls for enhanced data")
        except Exception as e:
            print(f"           ERROR in parallel API calls: {e}")
            all_patterns = [[] for _ in columns_to_process]
            all_datatypes = [[] for _ in columns_to_process]
            all_frequencies = [[] for _ in columns_to_process]

        # Process results for each column
        for idx, col in enumerate(columns_to_process):
            column_name = col['column_name']
            column_id_external = col['column_id']

            # Process patterns
            try:
                patterns = all_patterns[idx]
                if isinstance(patterns, Exception):
                    print(f"           WARNING: Could not fetch patterns for {column_name}: {patterns}")
                    patterns = []

                if patterns and len(patterns) > 0:
                    print(f"           Found {len(patterns)} patterns for {column_name}")

                for pattern in patterns:
                    pattern_record = FactColumnPattern(
                        org_id=self.org_id,
                        profiling_run_id=run_id,
                        profiling_task_id=task.profiling_task_id,
                        run_key=run_key,
                        column_id_external=column_id_external,
                        column_name=column_name,
                        domain_value=pattern.get('domainValue'),
                        pattern_label=pattern.get('patternLabel'),
                        inferred_datatype=pattern.get('inferredDatatype'),
                        satisfied_count=pattern.get('satisfiedCount'),
                        satisfied_count_percent=pattern.get('satisfiedCountPercent'),
                        total_rows=pattern.get('totalRows'),
                        run_timestamp=run_timestamp
                    )
                    self.db.add(pattern_record)
            except Exception as e:
                print(f"           WARNING: Could not process patterns for {column_name}: {e}")

            # Process data types
            try:
                data_types = all_datatypes[idx]
                if isinstance(data_types, Exception):
                    print(f"           WARNING: Could not fetch data types for {column_name}: {data_types}")
                    data_types = []

                if data_types and len(data_types) > 0:
                    print(f"           Found {len(data_types)} data types for {column_name}")

                for dt in data_types:
                    # Determine if documented or inferred
                    inferred_type = dt.get('inferredDatatype', '')
                    category = 'DOCUMENTED' if dt.get('documentedDataType') else 'INFERRED'

                    datatype_record = FactColumnDataType(
                        org_id=self.org_id,
                        profiling_run_id=run_id,
                        profiling_task_id=task.profiling_task_id,
                        run_key=run_key,
                        column_id_external=column_id_external,
                        column_name=column_name,
                        datatype_category=category,
                        inferred_datatype=inferred_type,
                        frequency=dt.get('frequency'),
                        frequency_percent=dt.get('frequencyPercent'),
                        total_rows=dt.get('totalRows'),
                        run_timestamp=run_timestamp
                    )
                    self.db.add(datatype_record)
            except Exception as e:
                print(f"           WARNING: Could not process data types for {column_name}: {e}")

            # Process value frequencies
            try:
                value_frequencies = all_frequencies[idx]
                if isinstance(value_frequencies, Exception):
                    print(f"           WARNING: Could not fetch value frequencies for {column_name}: {value_frequencies}")
                    value_frequencies = []

                if value_frequencies and len(value_frequencies) > 0:
                    print(f"           Found {len(value_frequencies)} value frequencies for {column_name}")

                for rank, vf in enumerate(value_frequencies, start=1):
                    value_freq_record = FactColumnValueFrequency(
                        org_id=self.org_id,
                        profiling_run_id=run_id,
                        run_key=run_key,
                        profiling_task_id=task.profiling_task_id,
                        column_id_external=column_id_external,
                        column_name=column_name,
                        column_value=vf.get('columnValue'),
                        frequency=vf.get('frequency'),
                        percent=vf.get('percent'),
                        is_outlier=1 if vf.get('isOutlier') else 0,
                        total_rows=vf.get('totalRows'),
                        row_identifier=vf.get('rowIdentifier'),
                        value_length=vf.get('length'),
                        value_rank=rank,
                        run_timestamp=run_timestamp
                    )
                    self.db.add(value_freq_record)
            except Exception as e:
                print(f"           WARNING: Could not process value frequencies for {column_name}: {e}")

            except Exception as e:
                print(f"           ERROR syncing enhanced data for column {stat.get('columnName')}: {e}")

        # Commit all enhanced data
        try:
            self.db.commit()
        except Exception as e:
            print(f"           ERROR committing enhanced profiling data: {e}")
            self.db.rollback()

    def _get_or_create_column(self, column_name: str, data_type: str) -> DimColumn:
        """Get or create column dimension."""
        # Check if exists
        column = self.db.query(DimColumn).filter_by(column_name=column_name).first()

        if not column:
            column = DimColumn(
                org_id=self.org_id,
                column_name=column_name,
                data_type=data_type,
                created_at=datetime.utcnow()
            )
            self.db.add(column)
            self.db.flush()  # Get the ID without committing

        return column

    def _get_or_create_time(self, timestamp: datetime) -> int:
        """Get or create time dimension entry."""
        # Convert to datetime at midnight for consistency with DB schema
        date_val = datetime(timestamp.year, timestamp.month, timestamp.day)

        # Check if exists
        time_entry = self.db.query(DimTime).filter_by(date=date_val).first()

        if not time_entry:
            try:
                time_entry = DimTime(
                    date=date_val,
                    year=date_val.year,
                    month=date_val.month,
                    day=date_val.day,
                    quarter=((date_val.month - 1) // 3) + 1,
                    week=date_val.isocalendar()[1],
                    day_of_week=date_val.weekday(),
                    day_name=date_val.strftime('%A'),
                    month_name=date_val.strftime('%B'),
                    is_weekend=1 if date_val.weekday() >= 5 else 0
                )
                self.db.add(time_entry)
                self.db.flush()
            except Exception as e:
                # If unique constraint fails, rollback and query again
                self.db.rollback()
                time_entry = self.db.query(DimTime).filter_by(date=date_val).first()
                if not time_entry:
                    raise e

        return time_entry.time_id

    def _transform_statistics_to_metrics(self, stat: Dict[str, Any]) -> Dict[str, Any]:
        """Transform statistics object to metric_type: metric_value dict."""
        metrics = {}

        # Numeric metrics
        if stat.get('totalRows') is not None:
            metrics['TOTAL_ROWS'] = float(stat['totalRows'])

        if stat.get('nulCount') is not None:
            metrics['NULL_COUNT'] = float(stat['nulCount'])

        if stat.get('nulPercent') is not None:
            metrics['NULL_PERCENT'] = float(stat['nulPercent'])

        if stat.get('distinctCount') is not None:
            metrics['DISTINCT_COUNT'] = float(stat['distinctCount'])

        if stat.get('distinctPercent') is not None:
            metrics['DISTINCT_PERCENT'] = float(stat['distinctPercent'])

        if stat.get('duplicateCount') is not None:
            metrics['DUPLICATE_COUNT'] = float(stat['duplicateCount'])

        if stat.get('blankCount') is not None:
            metrics['BLANK_COUNT'] = float(stat['blankCount'])

        if stat.get('zeroCount') is not None:
            metrics['ZERO_COUNT'] = float(stat['zeroCount'])

        if stat.get('averageValue'):
            try:
                metrics['AVG_VALUE'] = float(stat['averageValue'])
            except:
                pass

        if stat.get('standardDeviation'):
            try:
                metrics['STD_DEVIATION'] = float(stat['standardDeviation'])
            except:
                pass

        if stat.get('minimumLength') is not None:
            metrics['MIN_LENGTH'] = float(stat['minimumLength'])

        if stat.get('maximumLength') is not None:
            metrics['MAX_LENGTH'] = float(stat['maximumLength'])

        return metrics

    def _upsert_metric(
        self,
        run_id: str,
        task_id: str,
        asset_id: str,
        column_id: int,
        time_id: int,
        column_name: str,
        metric_type: str,
        metric_value: float,
        run_timestamp: datetime,
        column_type: str = None,
        column_id_external: str = None,
        documented_data_type: str = None,
        inferred_data_type: str = None,
        inferred_patterns: str = None,
        rule_output_mapping_id: str = None,
        data_source_field_id: str = None,
        column_key: int = None
    ):
        """Insert or update a metric in the fact table."""
        # Check if exists - must match on run_id, column_name, metric_type, AND column_type
        # because the same column_name can exist as both DATASOURCEFIELD and MAPPLETFIELD
        existing = self.db.query(FactProfilingResult).filter_by(
            profiling_run_id=run_id,
            column_name=column_name,
            metric_type=metric_type,
            column_type=column_type
        ).first()

        if existing:
            # Update
            existing.metric_value = metric_value
            existing.run_timestamp = run_timestamp
            existing.column_type = column_type
            existing.column_id_external = column_id_external
            existing.documented_data_type = documented_data_type
            existing.inferred_data_type = inferred_data_type
            existing.inferred_patterns = inferred_patterns
            existing.rule_output_mapping_id = rule_output_mapping_id
            existing.data_source_field_id = data_source_field_id
            existing.column_key = column_key
        else:
            # Create
            fact = FactProfilingResult(
                org_id=self.org_id,
                profiling_run_id=run_id,
                profiling_task_id=task_id,
                dq_asset_id=asset_id,
                column_id=column_id,
                time_id=time_id,
                metric_type=metric_type,
                metric_value=metric_value,
                column_name=column_name,
                run_timestamp=run_timestamp,
                column_type=column_type,
                column_id_external=column_id_external,
                documented_data_type=documented_data_type,
                inferred_data_type=inferred_data_type,
                inferred_patterns=inferred_patterns,
                rule_output_mapping_id=rule_output_mapping_id,
                data_source_field_id=data_source_field_id,
                column_key=column_key,
                created_at=datetime.utcnow()
            )
            self.db.add(fact)

    def _parse_timestamp(self, timestamp: Any) -> Optional[datetime]:
        """Parse timestamp from API (epoch milliseconds)."""
        if not timestamp:
            return None
        try:
            return datetime.fromtimestamp(float(timestamp) / 1000.0)
        except:
            return None

    def _ms_to_seconds(self, milliseconds: Any) -> Optional[float]:
        """Convert milliseconds to seconds."""
        if milliseconds is None:
            return None
        try:
            return float(milliseconds) / 1000.0
        except:
            return None

    def _update_run_progress(self):
        """Update the sync job run record with current progress."""
        if not self.sync_run_id:
            return

        from ..models import SyncJobRun
        run = self.db.query(SyncJobRun).filter(SyncJobRun.id == self.sync_run_id).first()
        if run:
            run.tasks_processed = self.stats["profiles_synced"]
            run.runs_processed = self.stats["runs_synced"]
            run.results_inserted = self.stats["statistics_synced"]
            run.errors_count = self.stats["errors"]
            run.projects_processed = self.stats["total_profiles"]  # Reuse field for total count
            self.db.commit()

    async def _sync_profiled_fields(
        self,
        profiled_fields: List[Dict[str, Any]],
        task: DimProfilingTask,
        run_id: str
    ):
        """
        Sync profiled fields from runDetail API.
        Handles both DATASOURCEFIELD and MAPPLETFIELD types.
        """
        # Track FRS IDs for batch metadata fetch
        frs_ids_to_fetch = []

        print(f"           DEBUG: _sync_profiled_fields called for run {run_id[:30]}, processing {len(profiled_fields)} fields")

        for field in profiled_fields:
            field_type = field.get('fieldType')

            if field_type == 'DATASOURCEFIELD':
                self._sync_data_source_field(field, task, run_id)
            elif field_type == 'MAPPLETFIELD':
                rule_name = field.get('name', 'Unknown')
                output_mappings = field.get('outputFieldMappings', [])
                print(f"           DEBUG: Processing MAPPLETFIELD '{rule_name}' with {len(output_mappings)} output mappings")
                await self._sync_rule_mapplet(field, task, run_id)

                # Collect FRS IDs that need metadata
                frs_id = field.get('frsId')
                if frs_id:
                    frs_ids_to_fetch.append(frs_id)

        # Batch fetch and update rule metadata
        if frs_ids_to_fetch:
            await self._update_rule_metadata(frs_ids_to_fetch)

        # Sync rule occurrences ONCE for the entire profile (not per rule)
        # This avoids redundant API calls since rule occurrences are profile-level, not rule-level
        await self._sync_rule_occurrence_for_profile(task)

    def _sync_data_source_field(
        self,
        field: Dict[str, Any],
        task: DimProfilingTask,
        run_id: str
    ):
        """Sync a data source field."""
        field_id = field.get('id')
        if not field_id:
            return

        # Check if exists
        existing = self.db.query(DimDataSourceField).filter_by(field_id=field_id).first()

        if not existing:
            ds_field = DimDataSourceField(
                field_id=field_id,
                org_id=self.org_id,
                profiling_task_id=task.profiling_task_id,
                profiling_run_id=run_id,
                column_key=field.get('columnKey'),
                source_name=field.get('sourceName'),
                field_name=field.get('fieldName'),
                precision=field.get('precision'),
                scale=field.get('scale'),
                is_deleted=field.get('isDeleted', False),
                applied_by=field.get('appliedBy'),
                field_type=field.get('fieldType', 'DATASOURCEFIELD')
            )
            self.db.add(ds_field)
            self.stats["data_source_fields_synced"] += 1

        self.db.commit()

    async def _sync_rule_mapplet(
        self,
        field: Dict[str, Any],
        task: DimProfilingTask,
        run_id: str
    ):
        """Sync a rule/mapplet with input/output mappings."""
        rule_id = field.get('id')
        rule_name = field.get('name', 'Unknown')
        if not rule_id:
            return

        # Check if exists
        existing = self.db.query(DimRuleMapplet).filter_by(rule_mapplet_id=rule_id).first()

        if not existing:
            rule = DimRuleMapplet(
                rule_mapplet_id=rule_id,
                org_id=self.org_id,
                profiling_task_id=task.profiling_task_id,
                profiling_run_id=run_id,
                frs_id=field.get('frsId'),
                scorecard_id=field.get('scoreCardId'),
                assignment_identifier=field.get('assignmentIdentifier'),
                rule_type=field.get('ruleType'),
                field_type='MAPPLETFIELD',
                is_deleted=field.get('isDeleted', False),
                applied_by=field.get('appliedBy')
            )
            self.db.add(rule)
            self.db.commit()
            self.stats["rule_mapplets_synced"] += 1
            self.stats["output_mappings_synced"] = self.stats.get("output_mappings_synced", 0)
        else:
            # Rule exists, but we still need to sync mappings
            self.stats["existing_rules_processed"] = self.stats.get("existing_rules_processed", 0) + 1

        # ALWAYS sync input/output mappings for this run, even if rule mapplet exists
        # Each run generates new mapping IDs that must be stored
        input_mappings = field.get('inputFieldMappings', [])
        for input_map in input_mappings:
            self._sync_rule_input_mapping(input_map, rule_id, run_id)

        # Sync output mappings
        output_mappings = field.get('outputFieldMappings', [])
        for output_map in output_mappings:
            self._sync_rule_output_mapping(output_map, rule_id, run_id)

    def _sync_rule_input_mapping(
        self,
        mapping: Dict[str, Any],
        rule_mapplet_id: str,
        run_id: str
    ):
        """Sync rule input mapping."""
        mapping_id = mapping.get('id')
        if not mapping_id:
            return

        # Check if this specific combination exists (mapping_id is reused across runs!)
        existing = self.db.query(FactRuleInputMapping).filter_by(
            mapping_id=mapping_id,
            profiling_run_id=run_id
        ).first()

        if not existing:
            input_map = FactRuleInputMapping(
                mapping_id=mapping_id,
                org_id=self.org_id,
                rule_mapplet_id=rule_mapplet_id,
                profiling_run_id=run_id,
                data_source_field_name=mapping.get('dataSourceFieldName'),
                in_field_name=mapping.get('inFieldName'),
                data_source_field_precision=mapping.get('dataSourceFieldPrecision'),
                data_source_field_scale=mapping.get('dataSourceFieldScale'),
                is_deleted=mapping.get('isDeleted', False)
            )
            self.db.add(input_map)

        self.db.commit()

    def _sync_rule_output_mapping(
        self,
        mapping: Dict[str, Any],
        rule_mapplet_id: str,
        run_id: str
    ):
        """Sync rule output mapping."""
        mapping_id = mapping.get('id')
        if not mapping_id:
            print(f"           DEBUG: Output mapping has no ID, skipping")
            return

        # Check if this specific combination exists (mapping_id is reused across runs!)
        existing = self.db.query(FactRuleOutputMapping).filter_by(
            mapping_id=mapping_id,
            profiling_run_id=run_id
        ).first()

        if not existing:
            output_map = FactRuleOutputMapping(
                mapping_id=mapping_id,
                org_id=self.org_id,
                rule_mapplet_id=rule_mapplet_id,
                profiling_run_id=run_id,
                column_key=mapping.get('columnKey'),
                out_field_name=mapping.get('outFieldName'),
                datatype=mapping.get('datatype'),
                label=mapping.get('label'),
                is_deleted=mapping.get('isDeleted', False)
            )
            self.db.add(output_map)
            self.stats["output_mappings_synced"] = self.stats.get("output_mappings_synced", 0) + 1
            print(f"           DEBUG: Created output mapping {mapping_id[:30]}... for run {run_id[:20]}...")
        else:
            print(f"           DEBUG: Output mapping {mapping_id[:30]}... already exists, skipping")

        self.db.commit()

    async def _sync_rule_occurrence_for_profile(
        self,
        task: DimProfilingTask
    ):
        """
        Sync all rule occurrences for a profile.

        Rule occurrences are profile-level configuration (not per-run).
        They define quality thresholds for rules in a profiling task.
        Should be called ONCE per profile after all rules and output mappings are synced.
        """
        if not self.rule_occurrence_service:
            return

        try:
            # Fetch all rule occurrences for the profile using profiling_task_id as API parameter
            # Note: API endpoint uses profile ID (which is profiling_task_id in our model)
            occurrences = await self.rule_occurrence_service.sync_rule_occurrences(
                self.db,
                self.org_id,
                task.profiling_task_id,  # Database ID
                task.profiling_task_id   # API expects profile ID (same as profiling_task_id)
            )
            self.stats["rule_occurrences_synced"] += len(occurrences)
            if occurrences:
                print(f"           Synced {len(occurrences)} rule occurrences for profile {task.profiling_name}")
        except Exception as e:
            print(f"           WARNING: Could not sync rule occurrences for profile {task.profiling_name}: {e}")

    async def _sync_connection_details(self, connection_id: str):
        """Sync connection details from FRS API."""
        if not self.connection_service or not connection_id:
            return

        try:
            connection = await self.connection_service.sync_connection(
                self.db,
                self.org_id,
                connection_id
            )
            if connection:
                self.stats["connections_synced"] += 1
        except Exception as e:
            print(f"           WARNING: Could not sync connection {connection_id}: {e}")

    async def _update_rule_metadata(self, frs_ids: List[str]):
        """
        Fetch and update rule metadata from FRS API.

        Args:
            frs_ids: List of FRS IDs to fetch metadata for
        """
        if not frs_ids:
            return

        # Remove duplicates
        unique_frs_ids = list(set(frs_ids))

        try:
            # Batch fetch rule metadata from FRS API
            print(f"           Fetching metadata for {len(unique_frs_ids)} rules from FRS...")
            rule_docs = await self.profiling_service.get_rule_metadata(unique_frs_ids)

            if not rule_docs:
                print(f"           WARNING: No rule metadata returned from FRS")
                return

            print(f"           Retrieved metadata for {len(rule_docs)} rules")

            # Update each rule with metadata
            for doc in rule_docs:
                frs_id = doc.get('id')
                if not frs_id:
                    continue

                # Find rule(s) with this FRS ID
                rules = self.db.query(DimRuleMapplet).filter_by(frs_id=frs_id).all()

                for rule in rules:
                    # Update metadata fields
                    rule.name = doc.get('name')
                    rule.description = doc.get('description')

                    # Store documentType in rule_type field (reusing existing field)
                    rule.rule_type = doc.get('documentType')  # RULE_SPECIFICATION, VERIFIER, CLEANSE, DMAPPLET

                    # Extract dimension and exception flag from custom attributes
                    custom_attrs = doc.get('customAttributes', {})
                    if custom_attrs:
                        string_attrs = custom_attrs.get('stringAttrs', [])

                        for attr in string_attrs:
                            if attr.get('name') == 'DIMENSION':
                                rule.dimension = attr.get('value')
                            elif attr.get('name') == 'EXCEPTION':
                                rule.is_exception = attr.get('value', '').lower() == 'true'

            self.db.commit()
            print(f"           Updated metadata for {len(rule_docs)} rules")

        except Exception as e:
            print(f"           ERROR updating rule metadata: {e}")
            self.db.rollback()

    async def _backfill_inferred_types(self, run_id: str):
        """
        Backfill inferred data types from fact tables to data source fields.
        This avoids duplicate API calls during statistics sync.
        """
        try:
            # Get all data source fields for this run that need inferred types
            fields = self.db.query(DimDataSourceField).filter(
                DimDataSourceField.profiling_run_id == run_id,
                DimDataSourceField.inferred_data_type.is_(None)
            ).all()

            if not fields:
                return

            print(f"           Backfilling inferred types for {len(fields)} fields...")

            # For each field, get the most common inferred type from fact tables
            for field in fields:
                # Try patterns first (most reliable)
                pattern = self.db.query(FactColumnPattern).filter(
                    FactColumnPattern.profiling_run_id == run_id,
                    FactColumnPattern.column_id_external == field.field_id
                ).order_by(FactColumnPattern.satisfied_count.desc()).first()

                if pattern and pattern.inferred_datatype:
                    field.inferred_data_type = pattern.inferred_datatype
                    continue

                # Fallback to data types table
                datatype = self.db.query(FactColumnDataType).filter(
                    FactColumnDataType.profiling_run_id == run_id,
                    FactColumnDataType.column_id_external == field.field_id
                ).order_by(FactColumnDataType.frequency.desc()).first()

                if datatype and datatype.inferred_datatype:
                    field.inferred_data_type = datatype.inferred_datatype

            self.db.commit()
            print(f"           Backfilled inferred types successfully")

        except Exception as e:
            print(f"           WARNING: Could not backfill inferred types: {e}")
            self.db.rollback()
