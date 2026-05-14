# MAPPLETFIELD Statistics Sync Verification

## Issue
Profile `23a47d79-8d74-45f5-9498-9589ab67b3e7` has 2 rules with 6 output columns, but no MAPPLETFIELD statistics were being synced to the database.

## Root Cause
The metric-store API returns BOTH DATASOURCEFIELD and MAPPLETFIELD statistics, but the sync service wasn't properly linking MAPPLETFIELD statistics to rule output mappings.

## Fix Applied
Enhanced `star_schema_sync_service.py` to:
1. Extract `columnKey` from statistics
2. Link MAPPLETFIELD statistics to `FactRuleOutputMapping` by column_key AND profiling_run_id
3. Link DATASOURCEFIELD statistics to `DimDataSourceField` by field_id AND profiling_run_id
4. Set `rule_output_mapping_id` or `data_source_field_id` foreign key in `fact_profiling_result`

**CRITICAL:** Must filter by BOTH column_key/field_id AND profiling_run_id to prevent cross-contamination between profiles that reuse the same column keys.

## Verification Steps

### 1. Restart Backend
```bash
# Stop the current backend process
# Restart with: uvicorn app.main:app --reload --port 8000
```

### 2. Trigger Resync
Use the UI sync jobs page or API:
```bash
curl -X POST "http://localhost:8000/sync-jobs/{job_id}/run"
```

### 3. Verify Database

#### Check MAPPLETFIELD count for test profile:
```sql
SELECT 
    column_type,
    COUNT(*) as count,
    COUNT(DISTINCT column_name) as unique_columns
FROM fact_profiling_result
WHERE profiling_task_id = '23a47d79-8d74-45f5-9498-9589ab67b3e7'
GROUP BY column_type;
```

**Expected Results:**
- DATASOURCEFIELD: ~200 rows, ~23 unique columns
- MAPPLETFIELD: ~40-60 rows, 6 unique columns

#### Check foreign key linking:
```sql
SELECT 
    column_name,
    column_type,
    metric_type,
    metric_value,
    rule_output_mapping_id,
    data_source_field_id
FROM fact_profiling_result
WHERE profiling_task_id = '23a47d79-8d74-45f5-9498-9589ab67b3e7'
AND column_type = 'MAPPLETFIELD'
LIMIT 10;
```

**Expected:**
- All MAPPLETFIELD rows should have `rule_output_mapping_id` populated
- All MAPPLETFIELD rows should have `data_source_field_id` = NULL

#### Verify rule output mappings exist:
```sql
SELECT 
    m.out_field_name,
    m.column_key,
    m.mapping_id,
    COUNT(r.result_id) as result_count
FROM fact_rule_output_mapping m
LEFT JOIN fact_profiling_result r ON r.rule_output_mapping_id = m.mapping_id
WHERE m.profiling_run_id = '68a21e80-2b69-4240-bc59-9fc914ad190b'
GROUP BY m.out_field_name, m.column_key, m.mapping_id;
```

**Expected:**
All 6 output mappings should have result_count > 0

### 4. Test Data Explorer

Navigate to: `http://localhost:3000/data-explorer`

#### Query fact_profiling_result:
- Filter by `profiling_task_id = '23a47d79-8d74-45f5-9498-9589ab67b3e7'`
- Filter by `column_type = 'MAPPLETFIELD'`
- Should see 6 unique columns with multiple metrics each

### 5. Test UI Pages

#### Profiling Run Details:
`http://localhost:3000/profiling-run-details?runId=68a21e80-2b69-4240-bc59-9fc914ad190b`

Should display:
- Rule/mapplet statistics alongside data source field statistics
- Column names: ExceptionDescription, ExceptionPriority, IsCountryValid, isValid

#### Statistics Trends:
Navigate to statistics page and verify MAPPLETFIELD columns appear in the metrics

## Known Columns for Profile 23a47d79-8d74-45f5-9498-9589ab67b3e7

### MAPPLETFIELD Columns (from rule outputs):
| Column Name | Column Key | Rule | Mapping ID |
|-------------|------------|------|------------|
| ExceptionDescription | 40012 | Consistency_LAST_NAME, MIDDLE_NAME_isValid | 9efeb2fa-4c81-4091-99b7-b671c16232fd |
| ExceptionDescription | 40006 | IsCountryValid | 5c3be03e-5292-4409-8fe7-3b2a14873971 |
| ExceptionPriority | 40011 | Consistency_LAST_NAME, MIDDLE_NAME_isValid | 2b33d1e1-bddd-4459-800c-c52c652c6650 |
| ExceptionPriority | 40001 | IsCountryValid | bb19e572-b7b4-4606-b9a4-2ac09f2cef86 |
| IsCountryValid | 40009 | IsCountryValid | fccba826-215d-49a1-b601-38b6bb424e98 |
| isValid | 40010 | Consistency_LAST_NAME, MIDDLE_NAME_isValid | 8833a170-c542-44d7-9896-331843fde1e6 |

### Sample Expected Metrics:
For each MAPPLETFIELD column, expect metrics like:
- TOTAL_ROWS
- NULL_COUNT
- NULL_PERCENT
- DISTINCT_COUNT
- DISTINCT_PERCENT
- BLANK_COUNT
- MIN_LENGTH
- MAX_LENGTH

## Success Criteria
✓ MAPPLETFIELD results exist in database for test profile  
✓ All MAPPLETFIELD results have rule_output_mapping_id set  
✓ Foreign key joins work correctly  
✓ Data explorer displays MAPPLETFIELD results  
✓ UI pages show rule output statistics  
✓ All 6 MAPPLETFIELD columns appear with full metrics  
