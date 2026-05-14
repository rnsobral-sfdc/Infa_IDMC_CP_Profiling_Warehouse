# Remaining Issues and Required Fixes

## Status Overview

✓ **FIXED:** Data Explorer SQL syntax errors  
✓ **FIXED:** Database schema (unique constraint updated)  
✓ **FIXED:** Code logic for MAPPLETFIELD syncing  
⚠️ **PENDING:** Backend restart required to activate MAPPLETFIELD sync code  
❌ **NOT IMPLEMENTED:** Connection details syncing  
❌ **NOT IMPLEMENTED:** Rule occurrence syncing  

---

## Issue 1: MAPPLETFIELD Statistics Not Syncing

**Status:** Code is correct, but backend needs restart

**Evidence:**
- Database has 13 rule mapplets and 39 rule output mappings
- Database has 0 MAPPLETFIELD profiling results
- Code changes have been made but backend hasn't been restarted

**Root Cause:**
The updated `_sync_statistics` method in `star_schema_sync_service.py` links MAPPLETFIELD statistics to rule output mappings, but the running backend process is using the old code.

**Solution:**
**Restart the backend:** Stop and restart `uvicorn app.main:app --reload --port 8000`

**Files Modified:**
- `backend/app/services/star_schema_sync_service.py` (lines 500-590)
- `backend/app/models/facts.py` (line 80 - unique constraint)
- `backend/migrate_unique_constraint.py` (migration applied)

**Verification After Restart:**
```bash
# Trigger sync, then check:
curl -s "http://localhost:8000/admin/stats" | python -m json.tool

# Expected: profiling_results count should increase
# MAPPLETFIELD results should exist for profile 23a47d79-8d74-45f5-9498-9589ab67b3e7
```

---

## Issue 2: Connection Details Not Being Synced

**Status:** NOT IMPLEMENTED

**Expected Behavior:**
When syncing a profile, the connection details should be:
1. Fetched from `/api/v2/connection/{connectionId}` 
2. Stored in `dim_connection` table
3. Linked to `dim_dq_asset` via `connection_id`, `connection_name`, `connection_type` fields

**Current State:**
- `dim_connection` table is always empty (0 rows)
- `dim_dq_asset.connection_id` is always NULL
- The `_sync_connection_details` method exists but is **never called**

**API Endpoint:**
```
GET https://na1.dm-us.informaticacloud.com/saas/api/v2/connection/{connectionId}
```

**Response Fields to Store:**
```json
{
    "id": "010X4V0B00000000000A",
    "orgId": "010X4V",
    "name": "Oracle_RNS",
    "type": "Oracle",
    "baseType": "Oracle",
    "host": "USW9QG9VL3-AAD",
    "database": "XEPDB1",
    "schema": "DEMO",
    "port": 1521,
    "username": "DEMO",
    "agentId": "010X4V0800000000000Y",
    "runtimeEnvironmentId": "010X4V25000000000007",
    "instanceDisplayName": "Oracle",
    ... (28 fields total in DimConnection model)
}
```

**Required Changes:**

### 1. Update `_upsert_dq_asset` method
**File:** `backend/app/services/star_schema_sync_service.py` (around line 280)

**Current code (line 280-302):**
```python
asset = DimDQAsset(
    dq_asset_id=asset_id,
    org_id=self.org_id,
    # ... other fields ...
    connection_type=profile.get('profileType', 'COLUMN_PROFILE'),  # WRONG!
    # connection_id and connection_name are NOT set
)
```

**Should be:**
```python
# Get connection ID from profile
connection_id = profile.get('connectionId')

# Sync connection details if available
if connection_id:
    await self._sync_connection_details(connection_id)

# Look up connection in database
connection = None
connection_name = None
connection_type = None
if connection_id:
    connection = self.db.query(DimConnection).filter_by(connection_id=connection_id).first()
    if connection:
        connection_name = connection.connection_name
        connection_type = connection.connection_type

asset = DimDQAsset(
    dq_asset_id=asset_id,
    org_id=self.org_id,
    # ... other fields ...
    connection_id=connection_id,
    connection_name=connection_name,
    connection_type=connection_type,  # From connection details, not profileType
)
```

### 2. Implement Connection Detail Service
**File:** `backend/app/services/connection_detail_service.py`

**Current status:** Service exists but may need to use the correct API endpoint

**Verify endpoint:**
```python
async def get_connection_details(self, connection_id: str) -> Dict[str, Any]:
    """
    Fetch connection details from IDMC.
    
    Uses: GET /saas/api/v2/connection/{connectionId}
    """
    endpoint = f"/saas/api/v2/connection/{connection_id}"
    # ... implementation
```

### 3. Update `_sync_connection_details` method
**File:** `backend/app/services/star_schema_sync_service.py` (line 1169)

**Ensure it:**
- Calls the connection detail service
- Creates/updates `DimConnection` record with all 28 fields
- Returns the connection object

---

## Issue 3: Rule Occurrences Not Being Synced

**Status:** NOT IMPLEMENTED (or not being called)

**Expected Behavior:**
For each rule/mapplet in a profile, fetch and store rule occurrence details including:
- Threshold
- Target  
- Criticality (High, Medium, Low)
- Type (Consistency, etc.)
- Frequency
- Measuring method
- Link to mapplet column ID

**Current State:**
- `dim_rule_occurrence` table is always empty (0 rows)
- The `_sync_rule_occurrence_for_rule` method exists and is called (line 1054)
- But the table remains empty

**API Endpoint:**
```
GET https://na1-dqprofile.dm-us.informaticacloud.com/profiling-service/api/v1/ruleOccurrence/getAllRuleOccurrencesForProfile_V2_Token/{profileId}
```

**Response:**
```json
[
    {
        "id": "db492631-ec22-45ab-b9cc-ea86f3acfed6",
        "status": "READ",
        "metadata": "",
        "ruleOccurrenceRM": {
            "id": "db492631-ec22-45ab-b9cc-ea86f3acfed6",
            "name": "Consistency_LAST_NAME, MIDDLE_NAME_isValid",
            "description": "Consistency_LAST_NAME, MIDDLE_NAME_isValid",
            "ruleFRSId": "hdcKuZ8k4qYhI6d6RN60iG",
            "threshold": "84.0",
            "target": "95.0",
            "measuringMethod": "InformaticaCloudDataQuality",
            "frequency": "Daily",
            "criticality": "High",
            "type": "Consistency",
            "mappletColumnId": "8833a170-c542-44d7-9896-331843fde1e6"
        }
    }
]
```

**Required Investigation:**

1. **Check if rule_occurrence_service is initialized:**
   ```python
   # In StarSchemaSyncService.__init__
   self.rule_occurrence_service = RuleOccurrenceService(auth_service)
   ```

2. **Verify method is being called:**
   Add logging in `_sync_rule_occurrence_for_rule` to see if it's executing

3. **Check RuleOccurrenceService implementation:**
   **File:** `backend/app/services/rule_occurrence_service.py`
   - Verify the endpoint URL is correct
   - Check if it's properly creating DimRuleOccurrence records
   - Ensure it links to DimRuleMapplet via rule_frs_id

**Expected Database State (after fix):**
- For profile 23a47d79-8d74-45f5-9498-9589ab67b3e7: 2 rule occurrences (matching the 2 rules)
- Each occurrence should have threshold, target, criticality populated

---

## Priority Order for Fixes

### Priority 1: MAPPLETFIELD Statistics (CRITICAL)
**Action:** Restart backend
**Impact:** Enables rule output profiling results to display in UI
**Time:** Immediate

### Priority 2: Connection Details
**Action:** Implement connection syncing logic
**Impact:** Connection metadata appears in UI, enables connection-based filtering
**Time:** 1-2 hours

### Priority 3: Rule Occurrences
**Action:** Debug why rule occurrences aren't syncing
**Impact:** Rule threshold/target/criticality data available for reporting
**Time:** 30 minutes - 1 hour

---

## Testing Checklist

After implementing all fixes:

- [ ] Backend restarted with latest code
- [ ] Sync job completes without errors
- [ ] MAPPLETFIELD results exist for profile 23a47d79-8d74-45f5-9498-9589ab67b3e7
- [ ] `dim_connection` table has > 0 rows
- [ ] `dim_dq_asset.connection_id` is populated (not NULL)
- [ ] `dim_rule_occurrence` table has > 0 rows
- [ ] Data explorer shows all data correctly
- [ ] UI displays connection details
- [ ] UI displays rule thresholds/targets

---

## Quick Verification Commands

```bash
# Check table counts
curl -s "http://localhost:8000/admin/stats" | python -m json.tool

# Check MAPPLETFIELD results for test profile
curl -s "http://localhost:8000/data-explorer/tables/fact_profiling_result?filters=%7B%22profiling_task_id%22%3A%5B%2223a47d79-8d74-45f5-9498-9589ab67b3e7%22%5D%2C%22column_type%22%3A%5B%22MAPPLETFIELD%22%5D%7D" | grep total_count

# Check connection details
curl -s "http://localhost:8000/data-explorer/tables/dim_connection?limit=1"

# Check rule occurrences
curl -s "http://localhost:8000/data-explorer/tables/dim_rule_occurrence?limit=1"
```
