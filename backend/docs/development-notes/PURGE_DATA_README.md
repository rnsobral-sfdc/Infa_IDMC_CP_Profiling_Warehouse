# Data Purge Utility

This utility allows you to clear all profiling data from the database while preserving the schema structure.

## Methods

### 1. Command Line Script

```bash
# Purge all data but keep IDMC connections
python purge_data.py purge --keep-connections

# Purge all data including connections
python purge_data.py purge

# Drop and recreate all tables (complete reset)
python purge_data.py recreate

# Show help
python purge_data.py help
```

### 2. API Endpoints

#### Purge Data
```bash
# Keep connections (default)
curl -X POST http://localhost:8000/admin/purge-data?keep_connections=true

# Delete everything including connections
curl -X POST http://localhost:8000/admin/purge-data?keep_connections=false
```

#### Recreate Database
```bash
# WARNING: Drops all tables and recreates from scratch
curl -X POST http://localhost:8000/admin/recreate-database
```

#### Get Database Statistics
```bash
curl http://localhost:8000/admin/stats
```

## Tables Affected

### Fact Tables (Deleted First)
- `fact_profiling_result` - Profiling metrics
- `fact_column_pattern` - Column patterns
- `fact_column_datatype` - Data type frequencies
- `fact_column_value_frequency` - Value frequencies
- `fact_rule_input_mapping` - Rule input mappings
- `fact_rule_output_mapping` - Rule output mappings
- `fact_api_log` - API call logs

### Profiling Field Dimensions
- `dim_data_source_field` - Data source columns
- `dim_rule_mapplet` - Rules/mapplets
- `dim_rule_occurrence` - Rule occurrences with thresholds

### Other Dimension Tables
- `dim_profiling_run` - Profiling runs
- `dim_profiling_task` - Profiling tasks
- `dim_dq_asset` - DQ assets
- `dim_column` - Column metadata
- `dim_time` - Time dimension
- `dim_connection` - Connection details

### Application Tables
- `sync_job_run` - Sync job runs
- `sync_job` - Sync job configurations
- `idmc_connections` - IDMC connections (optional)

### Preserved Tables
- `users` - Always preserved to maintain admin accounts

## Deletion Order

The script deletes tables in the correct order to respect foreign key constraints:
1. Fact tables (bottom of hierarchy)
2. Profiling field dimensions
3. Other dimension tables
4. Application tables

## Safety Features

- **Transaction-based**: All deletions happen in a single transaction
- **Rollback on error**: If any deletion fails, all changes are rolled back
- **Connection preservation**: By default, keeps IDMC connection records
- **User preservation**: Never deletes user accounts

## Use Cases

### Before Running a Fresh Sync
```bash
python purge_data.py purge --keep-connections
```
Then run your sync job to populate with fresh data.

### Complete Reset for Testing
```bash
python purge_data.py recreate
```
Then recreate your IDMC connection and run sync.

### Clear Specific Organization Data
Use the API with org_id filtering (not yet implemented).

## Verification

After purging, verify with:
```bash
curl http://localhost:8000/admin/stats
```

Or check the data explorer:
```
http://localhost:3000/data-explorer
```

## Recovery

⚠️ **WARNING**: This operation is irreversible!

There is no recovery mechanism. Make sure to:
1. Backup your database before purging if needed
2. Export important data if required
3. Document which connections were active

The data can only be recovered by re-syncing from IDMC.
