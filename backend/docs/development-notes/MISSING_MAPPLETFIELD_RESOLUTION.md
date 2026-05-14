# Missing MAPPLETFIELD Statistics - Final Resolution

## Current Status

**Problem:** Profile `23a47d79-8d74-45f5-9498-9589ab67b3e7` has 2 rules with 6 MAPPLETFIELD output columns, but these statistics are NOT showing in the database or UI.

**Investigation Results:**
- ✓ API returns MAPPLETFIELD statistics (6 columns with full data)
- ✓ Rule output mappings exist with correct column_keys in database
- ✓ Sync service DOES call `get_column_statistics` and `_sync_statistics`
- ✓ Backend code has correct MAPPLETFIELD sync logic (lines 537-545)
- ✗ **0 MAPPLETFIELD statistics in database** despite sync running

**Last Sync:** 2026-05-02 07:23:01 (before debug logging was added)

## Root Cause

The sync code processes MAPPLETFIELD statistics correctly in theory, but we need to see WHY it's not storing them. Debug logging has been added to trace the issue.

## Resolution Steps

### Step 1: Ensure Backend is Running with Latest Code

The backend was already restarted, so it has the updated code including:
- MAPPLETFIELD sync logic (lines 537-545)
- Debug logging to trace MAPPLETFIELD processing

### Step 2: Trigger a New Sync Run

**Option A: Via UI**
1. Go to http://localhost:3000
2. Navigate to Sync Jobs page
3. Click "Run" button for the sync job
4. Wait for completion

**Option B: Via API**
```bash
curl -X POST "http://localhost:8000/sync/{job_id}/run"
```

### Step 3: Monitor the Console Output

Watch the backend console for debug messages like:
```
DEBUG: Processing MAPPLETFIELD 'isValid' with column_key=40010
DEBUG: Linked to mapping_id=8833a170-c542...
DEBUG: Stored 10 metrics for MAPPLETFIELD 'isValid'
```

If you see these messages, MAPPLETFIELD stats are being processed.

### Step 4: Verify Statistics Were Stored

After sync completes, run:

```bash
cd C:/Temp/Claude/ProfilingReport/backend
python -c "
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    result = db.execute(text('''
        SELECT
            r.column_name,
            COUNT(*) as metric_count
        FROM fact_profiling_result r
        JOIN dim_profiling_run run ON r.profiling_run_id = run.profiling_run_id
        WHERE run.profiling_task_id = '23a47d79-8d74-45f5-9498-9589ab67b3e7'
        AND r.column_type = 'MAPPLETFIELD'
        GROUP BY r.column_name
    '''))
    
    rows = result.fetchall()
    if rows:
        print('SUCCESS: MAPPLETFIELD statistics found!')
        for row in rows:
            print(f'  {row[0]}: {row[1]} metrics')
    else:
        print('ERROR: No MAPPLETFIELD statistics found')
        print('Check backend console for debug messages')
finally:
    db.close()
"
```

### Expected Results

You should see statistics for these columns:
- isValid: ~10 metrics
- ExceptionPriority: ~10 metrics (appears twice with different column_keys)
- ExceptionDescription: ~10 metrics (appears twice with different column_keys)
- IsCountryValid: ~10 metrics

## Debug Logging Added

The following debug messages were added to `star_schema_sync_service.py`:

**Line 540:**
```python
print(f"           DEBUG: Processing MAPPLETFIELD '{column_name}' with column_key={column_key}")
```

**Line 546:**
```python
print(f"           DEBUG: Linked to mapping_id={rule_output_mapping_id[:20]}...")
```

**Line 548:**
```python
print(f"           DEBUG: NO MATCHING OUTPUT MAPPING FOUND for column_key={column_key}")
```

**Line 623:**
```python
print(f"           DEBUG: Stored {len(metrics)} metrics for MAPPLETFIELD '{column_name}' with rule_output_mapping_id={rule_output_mapping_id}")
```

## Possible Issues to Watch For

### Issue 1: No Debug Messages

If you don't see any debug messages about MAPPLETFIELD:
- The statistics API might not be returning MAPPLETFIELD data
- Check if the sync is actually fetching statistics

### Issue 2: "NO MATCHING OUTPUT MAPPING FOUND"

If you see this message:
- The column_key from API doesn't match what's in `fact_rule_output_mapping`
- This shouldn't happen since we verified the keys match (40010, 40011, 40012, 40001, 40006, 40009)

### Issue 3: Statistics Processed But Not Stored

If you see "Linked" and "Stored" messages but stats still don't appear in database:
- Check for errors in the `_upsert_metric` function
- Database transaction might be rolling back

### Issue 4: Statistics Stored But Not Showing in UI

If statistics ARE in the database but not in UI:
- Check the `/profiling/results/{run_id}` API endpoint
- Verify it's returning MAPPLETFIELD statistics
- Check browser console for errors

## API Response Reference

The metric-store API returns MAPPLETFIELD columns like this:

```json
{
    "columnKey": 40010,
    "columnName": "isValid",
    "columnId": "8833a170-c542-44d7-9896-331843fde1e6",
    "columnType": "MAPPLETFIELD",
    "totalRows": 1671,
    "nulCount": 0,
    "distinctCount": 2,
    "documentedDataType": "string(100)",
    ...
}
```

The sync should:
1. Detect `columnType == "MAPPLETFIELD"`
2. Use `columnKey` (40010) to find matching output mapping
3. Link statistics via `rule_output_mapping_id`
4. Store all metrics (TOTAL_ROWS, NULL_COUNT, DISTINCT_COUNT, etc.)

## Next Actions

1. **Run a sync** for this profile
2. **Watch backend console** for debug messages
3. **Verify statistics** in database after sync
4. **Report findings**:
   - Did you see debug messages?
   - What did they say?
   - Are statistics now in database?

If statistics still don't appear after sync, share the debug console output so we can identify the exact failure point.
