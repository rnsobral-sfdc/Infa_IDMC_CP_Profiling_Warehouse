# Purge Script Fixes

## Issues Found

When running `purge_data.py`, several tables were not being emptied:
- `dim_data_source_field`: 64 rows remaining
- `dim_rule_mapplet`: 13 rows remaining
- `dim_time`: 36 rows remaining
- `fact_rule_input_mapping`: 17 rows remaining
- `fact_rule_output_mapping`: 39 rows remaining
- `sync_jobs`: 1 row remaining

## Root Causes

1. **Foreign Key Constraints**: SQLite foreign key constraints were enabled and preventing deletes
2. **No Commit Between Deletes**: The script was calling `.delete()` but not committing after each delete
3. **No Row Counts**: Script didn't show how many rows were deleted, making it hard to verify
4. **No Verification**: Script didn't verify that tables were actually empty after purge

## Fixes Applied

### 1. Disable Foreign Keys During Purge
```python
# Disable foreign key constraints temporarily (SQLite)
db.execute(text("PRAGMA foreign_keys = OFF"))
db.commit()
```

### 2. Commit After Each Delete
```python
count = db.query(FactProfilingResult).delete()
db.commit()  # Commit immediately after each delete
print(f"  OK FactProfilingResult ({count} rows)")
```

### 3. Show Row Counts
Each delete now shows how many rows were removed:
```
  OK FactRuleInputMapping (17 rows)
  OK FactRuleOutputMapping (39 rows)
  OK DimDataSourceField (64 rows)
```

### 4. Add Verification Step
After purge, script now verifies all tables are empty:
```python
# Verify all tables are empty (except preserved ones)
inspector = inspect(db.bind)
tables = inspector.get_table_names()

non_empty = []
for table in sorted(tables):
    result = db.execute(text(f'SELECT COUNT(*) as cnt FROM [{table}]'))
    count = result.fetchone()[0]
    if count > 0 and table not in ['idmc_connections', 'users']:
        non_empty.append((table, count))

if non_empty:
    print("WARNING: Some tables still have data")
else:
    print("SUCCESS: All tables purged successfully!")
```

### 5. Re-enable Foreign Keys
```python
# Re-enable foreign key constraints
db.execute(text("PRAGMA foreign_keys = ON"))
db.commit()
```

### 6. Better Error Handling
```python
except Exception as e:
    db.rollback()
    print(f"ERROR: Purge failed!")
    print(f"Error: {e}")
    
    # Re-enable foreign keys even on error
    try:
        db.execute(text("PRAGMA foreign_keys = ON"))
        db.commit()
    except:
        pass
    raise
```

## Test Results

### Test 1: Empty Database
```
CURRENT DATABASE STATE
======================================================================
No data tables (all empty)
Preserved tables:
  idmc_connections                         1 rows
Total rows: 1

TEST PASSED: All tables successfully purged!
  - Deleted: 0 rows
  - Preserved: 1 rows (connections + users)
```

### Test 2: Database with Data
After syncing data and running purge:
```
[1/4] Deleting fact tables...
  OK FactRuleInputMapping (17 rows)
  OK FactRuleOutputMapping (39 rows)

[2/4] Deleting profiling field dimensions...
  OK DimDataSourceField (64 rows)
  OK DimRuleMapplet (13 rows)

[3/4] Deleting other dimensions...
  OK DimTime (36 rows)

[4/4] Deleting application tables...
  OK SyncJob (1 rows)

SUCCESS: All tables purged successfully!
```

## Usage

### Purge All Data (Keep Connections)
```bash
python purge_data.py purge --keep-connections
```

### Purge All Data (Including Connections)
```bash
python purge_data.py purge
```

### Test Purge Script
```bash
python test_purge.py --yes
```

### Recreate Database from Scratch
```bash
python purge_data.py recreate
```

## Files Modified

- `backend/purge_data.py` - Fixed purge logic with FK disable, commits, and verification
- `backend/test_purge.py` - New comprehensive test script

## Verification

All tables are now properly emptied after running purge:

```
dim_column                              0 rows
dim_connection                          0 rows
dim_data_source_field                   0 rows
dim_dq_asset                            0 rows
dim_profiling_run                       0 rows
dim_profiling_task                      0 rows
dim_rule_mapplet                        0 rows
dim_rule_occurrence                     0 rows
dim_time                                0 rows
fact_api_log                            0 rows
fact_column_datatype                    0 rows
fact_column_pattern                     0 rows
fact_column_value_frequency             0 rows
fact_profiling_result                   0 rows
fact_rule_input_mapping                 0 rows
fact_rule_output_mapping                0 rows
idmc_connections                        1 rows  (preserved)
sync_job_runs                           0 rows
sync_jobs                               0 rows
users                                   0 rows  (preserved)
```

✓ Purge script now works correctly on both empty and populated databases
✓ All tables are properly emptied
✓ Foreign key constraints are handled correctly
✓ Connections can be optionally preserved
✓ Full verification and error handling
