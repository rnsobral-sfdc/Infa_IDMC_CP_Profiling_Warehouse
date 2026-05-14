# Star Schema Enhancement Plan

## Executive Summary

Based on the `/runDetail/{runId}` API response, we need to enhance the star schema to properly capture:
1. **Source Columns** (DATASOURCEFIELD) with source and field names
2. **Rule/Mapplet Columns** (MAPPLETFIELD) with input/output field mappings
3. **Run-level metadata** (numberOfDSColumns, numberOfRules, numberOfMappletColumns)

## Current Schema Analysis

### ✅ Tables to Keep (Core Business Value)

1. **DimProfilingTask** - Core business entity (profiling jobs)
2. **DimProfilingRun** - Core business entity (execution instances)
3. **FactProfilingResult** - Primary metric data for analysis
4. **FactColumnPattern** - Pattern analysis results
5. **FactColumnDataType** - Data type distribution
6. **FactColumnValueFrequency** - Value distribution analysis

### ❌ Tables to Remove/Consolidate (Limited Business Value)

1. **DimDQAsset** - Redundant with profiling task information
   - Project/folder info already in DimProfilingTask
   - Connection info not used for analysis
   - Full path is derived from task metadata

2. **DimConnection** - Rarely used, connection info available in IDMC
   - No direct relationship to profiling results
   - Can be queried from IDMC when needed

3. **DimColumn** - Weak dimension, better as attributes in fact table
   - Column info changes per run (data types, patterns)
   - No stable business key
   - Already denormalized in fact tables

4. **DimTime** - Overkill for simple time-series analysis
   - DateTime fields sufficient for trending
   - BI tools can slice by date without a dimension table
   - Adds complexity without value

5. **FactAPILog** - Infrastructure logging, not business analytics
   - Belongs in application logs, not data warehouse
   - No analytical value for end users
   - Bloats database without providing insights

## Enhanced Schema Design

### Principle: **Separate Data Source Fields from Rule/Mapplet Fields**

**Rationale:**
- Different business entities with different attributes
- Data source fields have: sourceName, fieldName, precision, scale
- Rule/mapplet fields have: frsId, ruleType, input mappings, output mappings
- Queries typically filter for one or the other
- Mixing them creates NULL-heavy sparse tables

---

## New Schema Structure

### 1. DimProfilingTask (Enhanced)
```sql
CREATE TABLE dim_profiling_task (
    profiling_task_id VARCHAR(255) PRIMARY KEY,
    org_id VARCHAR(255) INDEX,
    
    -- Identification
    frs_id VARCHAR(255) INDEX,
    profiling_name VARCHAR(255) INDEX,
    profiling_type VARCHAR(100),
    
    -- Hierarchy (from Objects API)
    project_name VARCHAR(255) INDEX,
    project_id VARCHAR(255),
    project_display_name VARCHAR(255),
    folder_path VARCHAR(1000) INDEX,
    folder_id VARCHAR(255),
    folder_display_name VARCHAR(255),
    full_path VARCHAR(2000) UNIQUE,
    
    -- Source Object Info (NEW)
    source_name VARCHAR(255),  -- Table/file being profiled
    source_type VARCHAR(100),  -- TABLE, FILE, etc.
    
    -- Metadata
    created_by VARCHAR(255) INDEX,
    created_at DATETIME INDEX,
    last_run_at DATETIME INDEX,
    is_active INT DEFAULT 1,
    updated_at DATETIME
);
```

**Changes:**
- ✅ Keep hierarchy info (valuable for filtering/grouping)
- ➕ Add source_name, source_type from runDetail API
- ❌ Remove dq_asset_id FK (eliminating DimDQAsset)
- ❌ Remove connection_id (not used for analysis)

---

### 2. DimProfilingRun (Enhanced)
```sql
CREATE TABLE dim_profiling_run (
    profiling_run_id VARCHAR(255) PRIMARY KEY,
    org_id VARCHAR(255) INDEX,
    profiling_task_id VARCHAR(255) FK INDEX,
    
    -- Run Identification
    run_key VARCHAR(50) INDEX,
    job_id VARCHAR(255),
    
    -- Execution Details
    run_status VARCHAR(50) INDEX,  -- COMPLETED, FAILED, RUNNING
    run_detail_status VARCHAR(50),
    start_time BIGINT,  -- Epoch milliseconds
    end_time BIGINT,
    execution_time_ms INT,
    run_start_time DATETIME INDEX,  -- Converted from epoch
    run_end_time DATETIME,
    run_duration_seconds INT,
    
    -- Sampling Info (NEW)
    sampling_type VARCHAR(50),  -- ALL_ROWS, FIRST_N, RANDOM
    sampling_rows INT,
    is_filter_enabled BOOLEAN,
    filter_name VARCHAR(255),
    
    -- Row Counts (NEW)
    rows_processed BIGINT,
    row_count BIGINT,  -- Keep for backward compatibility
    
    -- Profiling Coverage (NEW - from runDetail API)
    number_of_ds_columns INT,  -- Data source columns profiled
    number_of_rules INT,         -- Rules applied
    number_of_mapplet_columns INT,  -- Mapplet output columns profiled
    number_of_columns INT,       -- Total columns (DS + mapplet)
    
    -- Cost Tracking (NEW)
    run_cost_mb FLOAT,
    
    -- Detection Settings (NEW)
    is_detect_outlier BOOLEAN,
    
    -- User Info
    created_by VARCHAR(255),
    created_by_name VARCHAR(255),
    created_time BIGINT,
    
    -- Error Handling
    error_message VARCHAR(2000),
    created_at DATETIME
);
```

**Changes:**
- ➕ Add all metadata from runDetail API (sampling, costs, coverage)
- ➕ Add number_of_ds_columns, number_of_rules, number_of_mapplet_columns
- ✅ Keep run times (critical for performance analysis)
- ❌ Remove run_type (not in API response)

---

### 3. DimDataSourceField (NEW)
```sql
CREATE TABLE dim_data_source_field (
    field_id VARCHAR(255) PRIMARY KEY,  -- From profiled_fields.id
    org_id VARCHAR(255) INDEX,
    profiling_task_id VARCHAR(255) FK INDEX,
    profiling_run_id VARCHAR(255) FK INDEX,
    
    -- Field Identification
    column_key INT INDEX,
    source_name VARCHAR(255) INDEX,  -- Table/object name
    field_name VARCHAR(255) INDEX,   -- Column name
    
    -- Data Type Info
    precision INT,
    scale INT,
    
    -- Metadata
    is_deleted BOOLEAN DEFAULT FALSE,
    applied_by VARCHAR(50),  -- USER, SYSTEM
    field_type VARCHAR(50) DEFAULT 'DATASOURCEFIELD',
    
    created_at DATETIME,
    
    INDEX idx_field_source_name (source_name, field_name),
    INDEX idx_field_task_run (profiling_task_id, profiling_run_id)
);
```

**Purpose:** Track data source columns profiled in each run

**Key Fields from API:**
```json
{
    "id": "f22a6257-de35-4603-a2f6-a0c79685ec7b",
    "columnKey": 10013,
    "sourceName": "CUSTOMER",
    "fieldName": "FAX_NUMBER",
    "precision": 26,
    "scale": 0,
    "fieldType": "DATASOURCEFIELD",
    "isDeleted": false,
    "appliedBy": "USER"
}
```

---

### 4. DimRuleMapplet (NEW)
```sql
CREATE TABLE dim_rule_mapplet (
    rule_mapplet_id VARCHAR(255) PRIMARY KEY,  -- From profiled_fields.id
    org_id VARCHAR(255) INDEX,
    profiling_task_id VARCHAR(255) FK INDEX,
    profiling_run_id VARCHAR(255) FK INDEX,
    
    -- Rule Identification
    frs_id VARCHAR(255) INDEX,  -- Rule object ID in FRS
    scorecard_id VARCHAR(255),
    assignment_identifier VARCHAR(255),
    
    -- Rule Metadata
    rule_type VARCHAR(50) INDEX,  -- RULE_SPECIFICATION, DATA_QUALITY_RULE, etc.
    field_type VARCHAR(50) DEFAULT 'MAPPLETFIELD',
    
    -- Metadata
    is_deleted BOOLEAN DEFAULT FALSE,
    applied_by VARCHAR(50),  -- USER, SYSTEM
    
    created_at DATETIME,
    
    INDEX idx_rule_frs (frs_id),
    INDEX idx_rule_task_run (profiling_task_id, profiling_run_id)
);
```

**Purpose:** Track rules/mapplets applied in each run

**Key Fields from API:**
```json
{
    "id": "f5dbcee8-3ad0-42e6-91b6-aec64c91892e",
    "frsId": "2hzPQevNLuHj9BmWBUjNMJ",
    "scoreCardId": null,
    "assignmentIdentifier": "1baf3f19b4ba4a45b750cc203d21351b",
    "ruleType": "RULE_SPECIFICATION",
    "fieldType": "MAPPLETFIELD",
    "isDeleted": false,
    "appliedBy": "USER"
}
```

---

### 5. FactRuleInputMapping (NEW)
```sql
CREATE TABLE fact_rule_input_mapping (
    mapping_id VARCHAR(255) PRIMARY KEY,  -- From inputFieldMappings.id
    org_id VARCHAR(255) INDEX,
    rule_mapplet_id VARCHAR(255) FK INDEX,
    profiling_run_id VARCHAR(255) FK INDEX,
    
    -- Source Field Binding
    data_source_field_name VARCHAR(255) INDEX,  -- Source column name
    in_field_name VARCHAR(255),  -- Rule input port name
    
    -- Source Field Metadata
    data_source_field_precision INT,
    data_source_field_scale INT,
    
    -- Metadata
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at DATETIME,
    
    INDEX idx_input_rule (rule_mapplet_id),
    INDEX idx_input_source_field (data_source_field_name)
);
```

**Purpose:** Track which source columns feed into which rule input ports

**Key Fields from API:**
```json
{
    "id": "bbfb4604-1f61-469c-9501-a6b80a48077a",
    "dataSourceFieldName": "LAST_NAME",
    "inFieldName": "in_str1",
    "isDeleted": false,
    "dataSourceFieldPrecision": 100,
    "dataSourceFieldScale": 0
}
```

---

### 6. FactRuleOutputMapping (NEW)
```sql
CREATE TABLE fact_rule_output_mapping (
    mapping_id VARCHAR(255) PRIMARY KEY,  -- From outputFieldMappings.id
    org_id VARCHAR(255) INDEX,
    rule_mapplet_id VARCHAR(255) FK INDEX,
    profiling_run_id VARCHAR(255) FK INDEX,
    
    -- Output Field Details
    column_key INT INDEX,  -- Used to join with profiling results
    out_field_name VARCHAR(255) INDEX,  -- Rule output port name
    datatype VARCHAR(100),
    label VARCHAR(255),
    
    -- Metadata
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at DATETIME,
    
    INDEX idx_output_rule (rule_mapplet_id),
    INDEX idx_output_column_key (column_key),
    INDEX idx_output_run_field (profiling_run_id, out_field_name)
);
```

**Purpose:** Track rule output ports that are profiled (these have profiling results)

**Key Fields from API:**
```json
{
    "id": "2b33d1e1-bddd-4459-800c-c52c652c6650",
    "columnKey": 40011,
    "datatype": "string",
    "outFieldName": "ExceptionPriority",
    "label": null,
    "isDeleted": false
}
```

---

### 7. FactProfilingResult (Enhanced)
```sql
CREATE TABLE fact_profiling_result (
    result_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    org_id VARCHAR(255) INDEX,
    
    -- Foreign Keys
    profiling_run_id VARCHAR(255) FK INDEX,
    profiling_task_id VARCHAR(255) FK INDEX,
    
    -- Column Reference (NEW - supports both types)
    column_key INT INDEX,  -- From API (both DS and mapplet fields)
    column_name VARCHAR(255) INDEX,  -- Denormalized
    column_type VARCHAR(100) INDEX,  -- 'DATASOURCEFIELD' or 'MAPPLETFIELD'
    column_id_external VARCHAR(255),  -- IDMC column ID
    
    -- Link to source/rule dimensions (NEW)
    data_source_field_id VARCHAR(255) FK,  -- If DATASOURCEFIELD
    rule_output_mapping_id VARCHAR(255) FK,  -- If MAPPLETFIELD
    
    -- Metrics
    metric_type VARCHAR(100) INDEX,
    metric_value FLOAT,
    metric_value_text VARCHAR(500),
    
    -- Context
    row_count BIGINT,
    run_timestamp DATETIME INDEX,
    
    -- Data Types
    documented_data_type VARCHAR(100),
    inferred_data_type VARCHAR(100),
    inferred_patterns TEXT,  -- JSON
    
    created_at DATETIME,
    
    UNIQUE INDEX idx_result_run_column_metric (profiling_run_id, column_name, metric_type),
    INDEX idx_result_column_key (column_key),
    INDEX idx_result_column_type (column_type, profiling_run_id),
    INDEX idx_result_ds_field (data_source_field_id),
    INDEX idx_result_rule_output (rule_output_mapping_id)
);
```

**Changes:**
- ➕ Add column_key (from API - universal identifier)
- ➕ Add data_source_field_id FK (link to DimDataSourceField)
- ➕ Add rule_output_mapping_id FK (link to FactRuleOutputMapping)
- ✅ Keep column_type to distinguish DS vs mapplet fields
- ❌ Remove dq_asset_id FK (eliminating DimDQAsset)
- ❌ Remove column_id FK (eliminating DimColumn)
- ❌ Remove time_id FK (eliminating DimTime)

---

### 8. FactColumnPattern, FactColumnDataType, FactColumnValueFrequency (Enhanced)
```sql
-- Add to all three tables:
ALTER TABLE fact_column_pattern 
    ADD COLUMN column_key INT INDEX AFTER column_id_external,
    ADD COLUMN column_type VARCHAR(100) INDEX AFTER column_key,
    DROP FOREIGN KEY IF EXISTS fk_..._dq_asset,
    DROP FOREIGN KEY IF EXISTS fk_..._time;

ALTER TABLE fact_column_datatype 
    ADD COLUMN column_key INT INDEX AFTER column_id_external,
    ADD COLUMN column_type VARCHAR(100) INDEX AFTER column_key;

ALTER TABLE fact_column_value_frequency 
    ADD COLUMN column_key INT INDEX AFTER column_id_external,
    ADD COLUMN column_type VARCHAR(100) INDEX AFTER column_key;
```

**Changes:**
- ➕ Add column_key (universal reference)
- ➕ Add column_type to distinguish DS vs mapplet fields
- ✅ Keep existing structure (working well)

---

## Data Lineage & Relationships

```
DimProfilingTask (1)
    └─→ DimProfilingRun (N)
           ├─→ DimDataSourceField (N) - DATASOURCEFIELD columns
           │      └─→ FactProfilingResult (N) - Metrics for DS columns
           │
           ├─→ DimRuleMapplet (N) - MAPPLETFIELD rules
           │      ├─→ FactRuleInputMapping (N) - Input port bindings
           │      └─→ FactRuleOutputMapping (N) - Output ports
           │             └─→ FactProfilingResult (N) - Metrics for mapplet outputs
           │
           ├─→ FactColumnPattern (N)
           ├─→ FactColumnDataType (N)
           └─→ FactColumnValueFrequency (N)
```

---

## Query Patterns Enabled

### 1. List all data source columns profiled in a run:
```sql
SELECT source_name, field_name, precision, scale
FROM dim_data_source_field
WHERE profiling_run_id = ?
ORDER BY source_name, field_name;
```

### 2. List all rules applied in a run:
```sql
SELECT r.frs_id, r.rule_type, COUNT(i.mapping_id) as input_count, COUNT(o.mapping_id) as output_count
FROM dim_rule_mapplet r
LEFT JOIN fact_rule_input_mapping i ON r.rule_mapplet_id = i.rule_mapplet_id
LEFT JOIN fact_rule_output_mapping o ON r.rule_mapplet_id = o.rule_mapplet_id
WHERE r.profiling_run_id = ?
GROUP BY r.rule_mapplet_id;
```

### 3. Show rule lineage (source columns → rule → output columns):
```sql
SELECT 
    i.data_source_field_name as source_column,
    i.in_field_name as rule_input_port,
    r.rule_type,
    o.out_field_name as rule_output_port,
    o.datatype as output_type
FROM dim_rule_mapplet r
JOIN fact_rule_input_mapping i ON r.rule_mapplet_id = i.rule_mapplet_id
JOIN fact_rule_output_mapping o ON r.rule_mapplet_id = o.rule_mapplet_id
WHERE r.profiling_run_id = ?
ORDER BY r.rule_mapplet_id, i.in_field_name, o.out_field_name;
```

### 4. Compare data source vs rule/mapplet profiling metrics:
```sql
SELECT 
    column_type,
    COUNT(DISTINCT column_name) as column_count,
    AVG(CASE WHEN metric_type = 'NULL_COUNT' THEN metric_value END) as avg_nulls,
    AVG(CASE WHEN metric_type = 'DISTINCT_COUNT' THEN metric_value END) as avg_distinct
FROM fact_profiling_result
WHERE profiling_run_id = ?
GROUP BY column_type;
```

### 5. Find rules using a specific source column:
```sql
SELECT DISTINCT r.frs_id, r.rule_type, o.out_field_name
FROM fact_rule_input_mapping i
JOIN dim_rule_mapplet r ON i.rule_mapplet_id = r.rule_mapplet_id
JOIN fact_rule_output_mapping o ON r.rule_mapplet_id = o.rule_mapplet_id
WHERE i.data_source_field_name = 'LAST_NAME'
AND r.profiling_run_id = ?;
```

---

## Migration Strategy

### Phase 1: Add New Tables (Non-Breaking)
1. Create DimDataSourceField
2. Create DimRuleMapplet
3. Create FactRuleInputMapping
4. Create FactRuleOutputMapping
5. Enhance DimProfilingRun with new fields

### Phase 2: Populate New Tables
1. Create sync service to call `/runDetail/{runId}` API
2. Extract and store data source fields
3. Extract and store rules/mapplets with mappings
4. Update existing runs with new metadata

### Phase 3: Enhance Fact Tables (Non-Breaking)
1. Add column_key to FactProfilingResult
2. Add column_type to all fact tables
3. Add FKs to new dimension tables
4. Backfill column_key from existing column_id_external

### Phase 4: Remove Deprecated Tables (Breaking)
1. Drop FactAPILog
2. Drop DimTime (remove time_id FK from facts)
3. Drop DimColumn (remove column_id FK from facts)
4. Drop DimConnection
5. Drop DimDQAsset (remove dq_asset_id FK from facts)

### Phase 5: Update Application Code
1. Update sync services to use new schema
2. Update API endpoints to query new tables
3. Update frontend to display rule lineage
4. Add new dashboard widgets (DS vs Rule metrics)

---

## Benefits of New Schema

✅ **Separation of Concerns**
- Data source fields and rule/mapplet fields are distinct entities
- No more NULL-heavy sparse tables
- Clear querying patterns

✅ **Complete Data Capture**
- All runDetail API data is stored
- Input/output mappings preserved
- Rule lineage is traceable

✅ **Better Performance**
- Smaller, focused tables
- More efficient indexes
- Faster queries (no JOINs to unused dimensions)

✅ **Simplified Maintenance**
- Removed unused tables (DimTime, DimConnection, DimDQAsset, DimColumn)
- Removed infrastructure table (FactAPILog)
- Cleaner schema, easier to understand

✅ **Enhanced Analytics**
- Compare DS vs rule/mapplet profiling results
- Analyze rule impact on data quality
- Track which source columns feed which rules
- Identify rule output columns for downstream analysis
