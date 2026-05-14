# Rule Occurrence to Profiling Results Linkage

## Complete Relationship Chain

```
DimProfilingTask (Profile)
    ↓
DimProfilingRun (Run)
    ↓
DimRuleMapplet (Rule)
    ↓
FactRuleOutputMapping (Output Column) ←──┐
    ↓                                     │
FactProfilingResult (Statistics)         │
                                          │
DimRuleOccurrence (Thresholds) ──────────┘
    (via mappletColumnId)
```

## Data Flow

### 1. Profile Execution Creates Rules

**Source:** `/profiling-service/api/v1/runDetail/{runId}`

**profiledFields Array:**
```json
{
  "id": "6f65d5bb-2a27-4c22-89f9-75e60b5baf8c",
  "fieldType": "MAPPLETFIELD",
  "frsId": "hdcKuZ8k4qYhI6d6RN60iG",
  "outputFieldMappings": [
    {
      "id": "8833a170-c542-44d7-9896-331843fde1e6",  ← This is the mapplet column ID
      "columnKey": 40010,
      "outFieldName": "isValid",
      "datatype": "string(100)"
    }
  ]
}
```

**Stored in:**
- `dim_rule_mapplet`: Rule metadata (id, frs_id)
- `fact_rule_output_mapping`: Output column (mapping_id = "8833a170-...", column_key = 40010)

---

### 2. Rule Occurrences Link to Output Columns

**Source:** `/profiling-service/api/v1/ruleOccurrence/getAllRuleOccurrencesForProfile_V2_Token/{profileId}`

**Response:**
```json
{
  "id": "db492631-ec22-45ab-b9cc-ea86f3acfed6",
  "ruleOccurrenceRM": {
    "id": "db492631-ec22-45ab-b9cc-ea86f3acfed6",
    "name": "Consistency_LAST_NAME, MIDDLE_NAME_isValid",
    "ruleFRSId": "hdcKuZ8k4qYhI6d6RN60iG",
    "mappletColumnId": "8833a170-c542-44d7-9896-331843fde1e6",  ← Links to output mapping!
    "threshold": "84.0",
    "target": "95.0",
    "criticality": "High"
  }
}
```

**Key Insight:**
`mappletColumnId` = `outputFieldMapping.id`

**Stored in:**
- `dim_rule_occurrence`: Rule thresholds (mapplet_column_id = "8833a170-...")

---

### 3. Profiling Results Link to Output Columns

**Source:** `/metric-store/api/v1/odata/Profiles('{profileId}')/Columns`

**Response:**
```json
{
  "columnKey": 40010,
  "columnName": "isValid",
  "columnId": "8833a170-c542-44d7-9896-331843fde1e6",
  "columnType": "MAPPLETFIELD",
  "totalRows": 1671,
  "nulCount": 0,
  "distinctCount": 2
}
```

**Stored in:**
- `fact_profiling_result`: Statistics linked via `rule_output_mapping_id`

---

## Database Relationships

### DimRuleOccurrence Table

```sql
CREATE TABLE dim_rule_occurrence (
    occurrence_id VARCHAR(255) PRIMARY KEY,
    profiling_task_id VARCHAR(255) FK → dim_profiling_task,
    rule_frs_id VARCHAR(255),
    rule_mapplet_id VARCHAR(255) FK → dim_rule_mapplet,
    
    -- THE KEY LINKAGE:
    mapplet_column_id VARCHAR(255) FK → fact_rule_output_mapping.mapping_id,
    
    -- Threshold data:
    threshold FLOAT,
    target FLOAT,
    criticality VARCHAR(50),  -- High, Medium, Low
    type VARCHAR(100),        -- Consistency, Completeness, etc.
    frequency VARCHAR(50)     -- Daily, Weekly, etc.
);
```

### FactRuleOutputMapping Table

```sql
CREATE TABLE fact_rule_output_mapping (
    mapping_id VARCHAR(255) PRIMARY KEY,  -- This is what mappletColumnId references!
    rule_mapplet_id VARCHAR(255) FK → dim_rule_mapplet,
    profiling_run_id VARCHAR(255) FK → dim_profiling_run,
    
    column_key INTEGER,           -- Used to join with profiling results
    out_field_name VARCHAR(255),  -- isValid, ExceptionDescription, etc.
    datatype VARCHAR(100),
    label VARCHAR(255)
);
```

### FactProfilingResult Table

```sql
CREATE TABLE fact_profiling_result (
    result_id INTEGER PRIMARY KEY,
    profiling_run_id VARCHAR(255),
    column_name VARCHAR(255),
    column_type VARCHAR(100),  -- 'MAPPLETFIELD'
    
    -- THE LINKAGE:
    rule_output_mapping_id VARCHAR(255) FK → fact_rule_output_mapping.mapping_id,
    
    metric_type VARCHAR(100),  -- TOTAL_ROWS, NULL_COUNT, etc.
    metric_value FLOAT
);
```

---

## Query Examples

### Get Rule Occurrence with Output Column Details

```sql
SELECT 
    ro.name AS rule_name,
    ro.threshold,
    ro.target,
    ro.criticality,
    rom.out_field_name AS measured_column,
    rom.column_key,
    rm.frs_id AS rule_frs_id
FROM dim_rule_occurrence ro
JOIN fact_rule_output_mapping rom ON ro.mapplet_column_id = rom.mapping_id
JOIN dim_rule_mapplet rm ON ro.rule_mapplet_id = rm.rule_mapplet_id
WHERE ro.profiling_task_id = '23a47d79-8d74-45f5-9498-9589ab67b3e7';
```

### Get Rule Statistics with Thresholds

```sql
SELECT 
    ro.name AS rule_name,
    ro.threshold,
    ro.target,
    ro.criticality,
    pr.column_name,
    pr.metric_type,
    pr.metric_value,
    CASE 
        WHEN pr.metric_value >= ro.target THEN 'Exceeds Target'
        WHEN pr.metric_value >= ro.threshold THEN 'Meets Threshold'
        ELSE 'Below Threshold'
    END AS performance
FROM dim_rule_occurrence ro
JOIN fact_rule_output_mapping rom ON ro.mapplet_column_id = rom.mapping_id
JOIN fact_profiling_result pr ON pr.rule_output_mapping_id = rom.mapping_id
WHERE ro.profiling_task_id = '23a47d79-8d74-45f5-9498-9589ab67b3e7'
AND pr.metric_type = 'TOTAL_ROWS';
```

### Get All Metrics for a Specific Rule Occurrence

```sql
SELECT 
    ro.name AS rule_name,
    ro.threshold,
    ro.target,
    pr.column_name,
    pr.metric_type,
    pr.metric_value
FROM dim_rule_occurrence ro
JOIN fact_rule_output_mapping rom ON ro.mapplet_column_id = rom.mapping_id
JOIN fact_profiling_result pr ON pr.rule_output_mapping_id = rom.mapping_id
WHERE ro.occurrence_id = 'db492631-ec22-45ab-b9cc-ea86f3acfed6'
ORDER BY pr.metric_type;
```

---

## Validation

### Expected Data for Profile 23a47d79-8d74-45f5-9498-9589ab67b3e7

#### Rule Occurrences (after sync):

| occurrence_id | name | mapplet_column_id | threshold | target | criticality |
|--------------|------|-------------------|-----------|--------|-------------|
| db492631-... | Consistency_LAST_NAME, MIDDLE_NAME_isValid | 8833a170-... | 84.0 | 95.0 | High |

#### Rule Output Mappings:

| mapping_id | column_key | out_field_name | Used By Rule Occurrence |
|-----------|-----------|----------------|------------------------|
| 8833a170-... | 40010 | isValid | ✓ Yes |
| 2b33d1e1-... | 40011 | ExceptionPriority | ? Check |
| 9efeb2fa-... | 40012 | ExceptionDescription | ? Check |
| bb19e572-... | 40001 | ExceptionPriority | ? Check |
| 5c3be03e-... | 40006 | ExceptionDescription | ? Check |
| fccba826-... | 40009 | IsCountryValid | ? Check |

#### Profiling Results:

Each output mapping should have ~7-10 metrics:
- TOTAL_ROWS
- NULL_COUNT
- NULL_PERCENT
- DISTINCT_COUNT
- DISTINCT_PERCENT
- BLANK_COUNT
- MIN_LENGTH
- MAX_LENGTH

---

## Implementation Status

✓ **Model Updated:** Added FK from `dim_rule_occurrence.mapplet_column_id` to `fact_rule_output_mapping.mapping_id`

✓ **Relationship Added:** Added ORM relationship in DimRuleOccurrence

✓ **Service Enhanced:** Added validation warning if mapplet_column_id doesn't match any output mapping

✓ **Foreign Key Enforced:** Database will enforce referential integrity

---

## Testing After Backend Restart

```bash
# 1. Check rule occurrences were synced
curl -s "http://localhost:8000/data-explorer/tables/dim_rule_occurrence?limit=10"

# 2. Verify mapplet_column_id is populated
curl -s "http://localhost:8000/data-explorer/tables/dim_rule_occurrence" | grep mapplet_column_id

# 3. Verify linkage is valid (should return matching output mappings)
# In database:
SELECT 
    ro.name,
    ro.mapplet_column_id,
    rom.out_field_name,
    rom.column_key
FROM dim_rule_occurrence ro
LEFT JOIN fact_rule_output_mapping rom ON ro.mapplet_column_id = rom.mapping_id
WHERE ro.profiling_task_id = '23a47d79-8d74-45f5-9498-9589ab67b3e7';
```

Expected: All rule occurrences should successfully join to their output mappings!
