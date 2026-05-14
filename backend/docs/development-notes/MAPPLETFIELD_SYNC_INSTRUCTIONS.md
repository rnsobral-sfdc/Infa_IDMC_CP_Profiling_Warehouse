# MAPPLETFIELD Statistics Missing - Resolution Steps

## Problem

Profile `23a47d79-8d74-45f5-9498-9589ab67b3e7` has 2 rules with 6 output columns, but NO MAPPLETFIELD statistics in the database.

**Current State:**
- ✓ Rule mapplets exist (2 rules)
- ✓ Rule output mappings exist (6 outputs: isValid, ExceptionPriority, ExceptionDescription, IsCountryValid)
- ✗ **NO MAPPLETFIELD statistics** in fact_profiling_result (0 rows)
- ✓ DATASOURCEFIELD statistics exist (20 columns, 202 metrics)

**Root Cause:**
The MAPPLETFIELD sync code was added/fixed in the previous session, but the backend server was never restarted. The old code is still running, which doesn't sync MAPPLETFIELD statistics.

## Solution

### Step 1: Restart the Backend

The backend needs to be restarted to load the updated sync code that includes MAPPLETFIELD statistics syncing.

**Stop the backend:**
```bash
# Find the backend process and stop it
# Or press Ctrl+C in the terminal running the backend
```

**Start the backend:**
```bash
cd C:/Temp/Claude/ProfilingReport/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Trigger a Sync

Once the backend is restarted, trigger a sync for the profile:

**Option A: Via UI (Recommended)**
1. Go to http://localhost:3000
2. Navigate to the profile page
3. Click "Sync" button
4. Wait for sync to complete

**Option B: Via API**
```bash
curl -X POST "http://localhost:8000/sync/run" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_ids": ["23a47d79-8d74-45f5-9498-9589ab67b3e7"],
    "sync_statistics": true,
    "sync_patterns": true,
    "sync_data_types": true
  }'
```

### Step 3: Verify MAPPLETFIELD Statistics

After sync completes, verify the statistics were synced:

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
        print('SUCCESS: MAPPLETFIELD statistics synced!')
        for row in rows:
            print(f'  {row[0]}: {row[1]} metrics')
    else:
        print('ERROR: No MAPPLETFIELD statistics found')
finally:
    db.close()
"
```

### Expected Results

After successful sync, you should see statistics for these columns:
- isValid (column_key=40010)
- ExceptionPriority (column_key=40011)
- ExceptionDescription (column_key=40012)
- ExceptionPriority (column_key=40001)
- ExceptionDescription (column_key=40006)
- IsCountryValid (column_key=40009)

Each column should have ~7-10 metrics:
- TOTAL_ROWS
- NULL_COUNT
- NULL_PERCENT
- DISTINCT_COUNT
- DISTINCT_PERCENT
- MIN_LENGTH
- MAX_LENGTH
- etc.

### Step 4: Verify UI Display

After statistics are synced:

1. Go to the profiling run details page
2. Click the "Rule Statistics" tab
3. You should now see:
   - MAPPLETFIELD columns (isValid, ExceptionPriority, etc.)
   - Statistics for each column (total rows, null count, distinct count, etc.)
   - Patterns (if available)
   - Data types (if available)
   - Rule occurrence details (threshold, target, criticality)

## What the Sync Code Does

### MAPPLETFIELD Statistics Sync (lines 537-545 in star_schema_sync_service.py)

```python
elif column_type == 'MAPPLETFIELD' and column_key:
    # Find matching rule output mapping by column key AND run_id
    output_mapping = self.db.query(FactRuleOutputMapping).filter_by(
        column_key=column_key,
        profiling_run_id=run_id
    ).first()
    if output_mapping:
        rule_output_mapping_id = output_mapping.mapping_id
```

### How It Works

1. **Metric-Store API** returns ALL columns (both DATASOURCEFIELD and MAPPLETFIELD) in a single response
2. **Sync service** identifies column type from `columnType` field
3. For MAPPLETFIELD:
   - Uses `column_key` to find matching entry in `fact_rule_output_mapping`
   - Links statistics via `rule_output_mapping_id`
   - Filters by `profiling_run_id` to prevent cross-profile contamination
4. For DATASOURCEFIELD:
   - Uses `column_id_external` to find matching entry in `dim_data_source_field`
   - Links statistics via `data_source_field_id`

## Troubleshooting

### If Statistics Still Don't Appear

1. **Check sync logs**:
   - Look for "MAPPLETFIELD" in console output
   - Should see messages like: "Synced N MAPPLETFIELD statistics"

2. **Check API Response**:
   - The metric-store API should return columns with `columnType: "MAPPLETFIELD"`
   - Check API logs for the Columns endpoint

3. **Check column_key matching**:
   ```sql
   SELECT 
       rom.out_field_name,
       rom.column_key,
       COUNT(r.result_id) as stat_count
   FROM fact_rule_output_mapping rom
   LEFT JOIN fact_profiling_result r ON r.rule_output_mapping_id = rom.mapping_id
   WHERE rom.profiling_run_id = '68a21e80-2b69-4240-bc59-9fc914ad190b'
   GROUP BY rom.out_field_name, rom.column_key
   ```
   
   This should show:
   - All output mappings
   - How many statistics are linked to each

### If Backend Won't Restart

Check for:
- Port 8000 already in use
- Python errors in console
- Missing dependencies

## Summary

The fix for MAPPLETFIELD statistics sync was already implemented in the code. The backend just needs to be **restarted** and a **sync run** to apply the changes. After that, the Rule Statistics tab will display the rule output column statistics.
