"""
Rule Occurrence Service
Fetches rule occurrences for profiling tasks from IDMC API.
"""
import httpx
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..models import DimRuleOccurrence, DimProfilingTask, DimRuleMapplet
from datetime import datetime


class RuleOccurrenceService:
    """Service for fetching and storing rule occurrences from IDMC API."""

    def __init__(self, profiling_url: str, session_token: str):
        """
        Initialize the rule occurrence service.

        Args:
            profiling_url: IDMC profiling service URL (e.g., https://na1-dqprofile.dm-us.informaticacloud.com)
            session_token: Authenticated session token
        """
        self.profiling_url = profiling_url.rstrip('/')
        self.session_token = session_token
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "IDS-SESSION-ID": session_token  # Profiling API uses IDS-SESSION-ID
        }

    async def fetch_rule_occurrences(self, profile_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all rule occurrences for a profile.

        API: GET /profiling-service/api/v1/ruleOccurrence/getAllRuleOccurrencesForProfile_V2_Token/{ProfileID}

        Args:
            profile_id: Profiling task ID (FRS ID)

        Returns:
            List of rule occurrence dictionaries
        """
        url = f"{self.profiling_url}/profiling-service/api/v1/ruleOccurrence/getAllRuleOccurrencesForProfile_V2_Token/{profile_id}"

        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                data = response.json()

                # Response is a list of rule occurrences
                if isinstance(data, list):
                    return data
                else:
                    print(f"Unexpected response format for profile {profile_id}")
                    return []

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    # No rule occurrences for this profile
                    return []
                print(f"Error fetching rule occurrences for profile {profile_id}: {e}")
                return []
            except Exception as e:
                print(f"Unexpected error fetching rule occurrences for profile {profile_id}: {e}")
                return []

    def parse_rule_occurrence(self, occurrence_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse rule occurrence from API response.

        Args:
            occurrence_data: Raw rule occurrence data from API

        Returns:
            Parsed rule occurrence attributes
        """
        rm_data = occurrence_data.get("ruleOccurrenceRM", {})

        parsed = {
            "occurrence_id": rm_data.get("id"),
            "name": rm_data.get("name"),
            "description": rm_data.get("description"),
            "rule_frs_id": rm_data.get("ruleFRSId"),
            "mapplet_column_id": rm_data.get("mappletColumnId"),
            "status": occurrence_data.get("status"),
            "additional_metadata": occurrence_data.get("metadata"),
        }

        # Parse threshold and target (may be strings)
        threshold = rm_data.get("threshold")
        if threshold:
            try:
                parsed["threshold"] = float(threshold)
            except (ValueError, TypeError):
                parsed["threshold"] = None

        target = rm_data.get("target")
        if target:
            try:
                parsed["target"] = float(target)
            except (ValueError, TypeError):
                parsed["target"] = None

        # Parse measurement settings
        parsed["measuring_method"] = rm_data.get("measuringMethod")
        parsed["frequency"] = rm_data.get("frequency")
        parsed["criticality"] = rm_data.get("criticality")
        parsed["type"] = rm_data.get("type")

        return parsed

    def upsert_rule_occurrence(
        self,
        db: Session,
        org_id: str,
        profiling_task_id: str,
        occurrence_data: Dict[str, Any]
    ) -> DimRuleOccurrence:
        """
        Create or update rule occurrence in database.

        Args:
            db: Database session
            org_id: Organization ID
            profiling_task_id: Profiling task ID
            occurrence_data: Parsed rule occurrence data

        Returns:
            DimRuleOccurrence instance
        """
        occurrence_id = occurrence_data["occurrence_id"]

        # Check if exists
        existing = db.query(DimRuleOccurrence).filter(
            DimRuleOccurrence.occurrence_id == occurrence_id
        ).first()

        if existing:
            # Update existing
            for key, value in occurrence_data.items():
                if key != "occurrence_id" and hasattr(existing, key):
                    setattr(existing, key, value)
            existing.org_id = org_id
            existing.profiling_task_id = profiling_task_id
            occurrence = existing
        else:
            # Create new
            occurrence = DimRuleOccurrence(
                org_id=org_id,
                profiling_task_id=profiling_task_id,
                **occurrence_data
            )
            db.add(occurrence)

        # Try to link to rule_mapplet if exists
        if occurrence_data.get("rule_frs_id"):
            rule_mapplet = db.query(DimRuleMapplet).filter(
                DimRuleMapplet.frs_id == occurrence_data["rule_frs_id"],
                DimRuleMapplet.profiling_task_id == profiling_task_id
            ).first()
            if rule_mapplet:
                occurrence.rule_mapplet_id = rule_mapplet.rule_mapplet_id

        # Verify mapplet_column_id links to a valid output mapping
        if occurrence_data.get("mapplet_column_id"):
            from ..models import FactRuleOutputMapping
            output_mapping = db.query(FactRuleOutputMapping).filter(
                FactRuleOutputMapping.mapping_id == occurrence_data["mapplet_column_id"]
            ).first()
            if not output_mapping:
                print(f"           WARNING: Rule occurrence {occurrence_data['occurrence_id']} references "
                      f"mapplet column {occurrence_data['mapplet_column_id']} which does not exist in output mappings")

        db.commit()
        db.refresh(occurrence)
        return occurrence

    async def sync_rule_occurrences(
        self,
        db: Session,
        org_id: str,
        profiling_task_id: str,
        profile_frs_id: str
    ) -> List[DimRuleOccurrence]:
        """
        Fetch and sync all rule occurrences for a profiling task.

        Args:
            db: Database session
            org_id: Organization ID
            profiling_task_id: Profiling task ID (database ID)
            profile_frs_id: Profile FRS ID (for API call)

        Returns:
            List of DimRuleOccurrence instances
        """
        # Fetch from API
        raw_occurrences = await self.fetch_rule_occurrences(profile_frs_id)

        occurrences = []
        for raw_data in raw_occurrences:
            # Parse
            parsed_data = self.parse_rule_occurrence(raw_data)

            # Skip if no occurrence_id
            if not parsed_data.get("occurrence_id"):
                continue

            # Upsert to database
            occurrence = self.upsert_rule_occurrence(
                db, org_id, profiling_task_id, parsed_data
            )
            occurrences.append(occurrence)

        print(f"           Synced {len(occurrences)} rule occurrences for task {profiling_task_id}")
        return occurrences
