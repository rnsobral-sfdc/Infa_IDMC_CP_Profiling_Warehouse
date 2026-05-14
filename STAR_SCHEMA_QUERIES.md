# Star Schema Query Examples

**Interactive Learning:** All queries shown in this document are available as tooltips in the Reports page. Simply hover over column headers and data cells to see the relevant SQL.

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Rule Validation Queries](#rule-validation-queries)
3. [Column Quality Queries](#column-quality-queries)
4. [Dimension Analytics Queries](#dimension-analytics-queries)
5. [Join Patterns](#join-patterns)

---

## Schema Overview

### Dimension Tables (dim_*)
- **dim_profiling_task** - Profiling tasks/jobs
- **dim_profiling_run** - Individual profiling runs (each execution)
- **dim_data_source_field** - Column metadata
- **dim_rule_mapplet** - Rule definitions with dimensions
- **dim_rule_occurrence** - Rule execution instances
- **dim_time** - Time dimension

### Fact Tables (fact_*)
- **fact_profiling_result** - Core metrics (DISTINCT_PERCENT, NULL_PERCENT, etc.)
- **fact_column_pattern** - Pattern analysis results
- **fact_column_datatype** - Data type inference results
- **fact_column_value_frequency** - Value frequency distribution
- **fact_rule_input_mapping** - Rule input connections
- **fact_rule_output_mapping** - Rule output connections with validation counts

---

## Rule Validation Queries

### Get Rule Details with Dimension

```sql
-- Get rule details including dimension classification
SELECT
  rm.rule_mapplet_id,
  rm.name as rule_name,
  rm.dimension,
  rm.rule_type,
  rm.is_exception
FROM dim_rule_mapplet rm
WHERE rm.name = 'Validate_Country'
  AND rm.org_id = '6inyp1FQ2QQkemoflBDG8e';
```

**Result columns:**
- `dimension` - VALIDITY, CONSISTENCY, COMPLETENESS
- `rule_type` - RULE_SPECIFICATION, VERIFIER
- `is_exception` - Boolean flag for exception rules

### Get Rule Validation Scores

```sql
-- Calculate validation score for a rule output
SELECT
  fom.output_name,
  SUM(CASE WHEN fcvf.value IN ('TRUE', '1', 'Valid') THEN fcvf.row_count ELSE 0 END) as valid_rows,
  SUM(CASE WHEN fcvf.value IN ('FALSE', '0', 'Invalid') THEN fcvf.row_count ELSE 0 END) as invalid_rows,
  SUM(fcvf.row_count) as total_rows,
  (SUM(CASE WHEN fcvf.value IN ('TRUE', '1', 'Valid') THEN fcvf.row_count ELSE 0 END) * 100.0 / 
   SUM(fcvf.row_count)) as score_percent
FROM fact_rule_output_mapping fom
JOIN fact_column_value_frequency fcvf
  ON fom.profiling_run_id = fcvf.profiling_run_id
  AND fom.column_name = fcvf.column_name
WHERE fom.rule_mapplet_id IN (
  SELECT rule_mapplet_id 
  FROM dim_rule_mapplet 
  WHERE name = 'Validate_Country'
)
  AND fom.output_name = 'out_Port'
GROUP BY fom.output_name;
```

**Key insight:** Rule outputs are stored as regular columns, and we count TRUE/FALSE values from the frequency table.

### Get Rule Trend Across Runs

```sql
-- Track rule score over multiple profiling runs
SELECT
  pr.run_key,
  pr.run_start_time,
  fom.output_name,
  (valid_rows * 100.0 / total_rows) as score
FROM dim_profiling_run pr
JOIN fact_rule_output_mapping fom ON pr.profiling_run_id = fom.profiling_run_id
JOIN (
  SELECT
    profiling_run_id,
    column_name,
    SUM(CASE WHEN value IN ('TRUE', '1', 'Valid') THEN row_count ELSE 0 END) as valid_rows,
    SUM(row_count) as total_rows
  FROM fact_column_value_frequency
  GROUP BY profiling_run_id, column_name
) freq ON fom.profiling_run_id = freq.profiling_run_id
      AND fom.column_name = freq.column_name
WHERE fom.rule_mapplet_id IN (
  SELECT rule_mapplet_id 
  FROM dim_rule_mapplet 
  WHERE name = 'Validate_Country'
)
ORDER BY pr.run_key DESC;
```

---

## Column Quality Queries

### Get Column Metadata

```sql
-- Get column information with task context
SELECT
  dsf.field_name,
  dsf.field_type,
  dsf.field_precision,
  dsf.field_scale,
  pt.profiling_name as task_name,
  pt.org_id
FROM dim_data_source_field dsf
JOIN dim_profiling_task pt ON dsf.profiling_task_id = pt.profiling_task_id
WHERE dsf.field_name = 'CUSTOMER_ID'
  AND pt.profiling_name = 'CDQPrimer101';
```

### Get Uniqueness Metric (DISTINCT_PERCENT)

```sql
-- Get uniqueness percentage across runs
SELECT
  pr.run_key,
  pr.run_start_time,
  fpr.metric_value as distinct_percent
FROM fact_profiling_result fpr
JOIN dim_profiling_run pr ON fpr.profiling_run_id = pr.profiling_run_id
WHERE fpr.column_name = 'CUSTOMER_ID'
  AND fpr.metric_type = 'DISTINCT_PERCENT'
  AND pr.profiling_task_id = 'c4b233b4-2684-4411-b3fa-c98dc5853af2'
ORDER BY pr.run_key DESC;
```

**Metric types in fact_profiling_result:**
- `DISTINCT_PERCENT` - Percentage of unique values
- `NULL_PERCENT` - Percentage of NULL values
- `DISTINCT_COUNT` - Count of unique values
- `NULL_COUNT` - Count of NULL values
- `TOTAL_COUNT` - Total row count

### Get Completeness Metric (NULL_PERCENT)

```sql
-- Get completeness (NULL percentage) across runs
SELECT
  pr.run_key,
  pr.run_start_time,
  fpr.metric_value as null_percent,
  (100 - fpr.metric_value) as completeness_percent
FROM fact_profiling_result fpr
JOIN dim_profiling_run pr ON fpr.profiling_run_id = pr.profiling_run_id
WHERE fpr.column_name = 'EMAIL'
  AND fpr.metric_type = 'NULL_PERCENT'
  AND pr.profiling_task_id = 'c4b233b4-2684-4411-b3fa-c98dc5853af2'
ORDER BY pr.run_key DESC;
```

**Note:** Lower NULL_PERCENT = Higher Completeness

### Get Pattern Cardinality

```sql
-- Get pattern analysis with frequency
SELECT
  pr.run_key,
  fcp.pattern_label,
  fcp.pattern_frequency,
  fcp.pattern_percent
FROM fact_column_pattern fcp
JOIN dim_profiling_run pr ON fcp.profiling_run_id = pr.profiling_run_id
WHERE fcp.column_name = 'PHONE'
  AND pr.profiling_task_id = 'c4b233b4-2684-4411-b3fa-c98dc5853af2'
ORDER BY pr.run_key DESC, fcp.pattern_frequency DESC;
```

**Pattern interpretation:**
- Low cardinality (< 5 patterns) = Good data consistency
- High cardinality (> 5 patterns) = Data quality issue or varied formats

### Get Data Type Cardinality

```sql
-- Get inferred data types with distribution
SELECT
  pr.run_key,
  fcdt.inferred_datatype,
  fcdt.row_count,
  fcdt.percentage
FROM fact_column_datatype fcdt
JOIN dim_profiling_run pr ON fcdt.profiling_run_id = pr.profiling_run_id
WHERE fcdt.column_name = 'AMOUNT'
  AND pr.profiling_task_id = 'c4b233b4-2684-4411-b3fa-c98dc5853af2'
ORDER BY pr.run_key DESC, fcdt.row_count DESC;
```

**Data type interpretation:**
- Low cardinality (< 5 types) = Consistent data types
- High cardinality (> 5 types) = Type inconsistency issue

### Get Value Frequency Distribution

```sql
-- Get most common values for a column
SELECT
  pr.run_key,
  fcvf.value,
  fcvf.row_count,
  fcvf.percentage
FROM fact_column_value_frequency fcvf
JOIN dim_profiling_run pr ON fcvf.profiling_run_id = pr.profiling_run_id
WHERE fcvf.column_name = 'STATUS'
  AND pr.profiling_task_id = 'c4b233b4-2684-4411-b3fa-c98dc5853af2'
ORDER BY pr.run_key DESC, fcvf.row_count DESC
LIMIT 20;
```

---

## Dimension Analytics Queries

### Average Score by Dimension Across Runs

```sql
-- Calculate average validation score grouped by dimension
SELECT
  rm.dimension,
  pr.run_key,
  pr.run_start_time,
  AVG((valid_rows * 100.0 / total_rows)) as avg_score,
  COUNT(DISTINCT rm.rule_mapplet_id) as rule_count
FROM dim_rule_mapplet rm
JOIN fact_rule_output_mapping fom ON rm.rule_mapplet_id = fom.rule_mapplet_id
JOIN dim_profiling_run pr ON fom.profiling_run_id = pr.profiling_run_id
JOIN (
  SELECT
    profiling_run_id,
    column_name,
    SUM(CASE WHEN value IN ('TRUE', '1', 'Valid') THEN row_count ELSE 0 END) as valid_rows,
    SUM(row_count) as total_rows
  FROM fact_column_value_frequency
  GROUP BY profiling_run_id, column_name
) freq ON fom.profiling_run_id = freq.profiling_run_id
      AND fom.column_name = freq.column_name
WHERE rm.dimension IN ('VALIDITY', 'CONSISTENCY', 'COMPLETENESS')
GROUP BY rm.dimension, pr.run_key, pr.run_start_time
ORDER BY rm.dimension, pr.run_key DESC;
```

### Rules by Dimension

```sql
-- List all rules grouped by dimension
SELECT
  rm.dimension,
  rm.name as rule_name,
  rm.rule_type,
  rm.is_exception,
  COUNT(DISTINCT fom.profiling_run_id) as execution_count
FROM dim_rule_mapplet rm
LEFT JOIN fact_rule_output_mapping fom ON rm.rule_mapplet_id = fom.rule_mapplet_id
WHERE rm.dimension IS NOT NULL
GROUP BY rm.dimension, rm.name, rm.rule_type, rm.is_exception
ORDER BY rm.dimension, rm.name;
```

---

## Join Patterns

### Star Schema Join Pattern: Profiling Results

```sql
-- Standard join pattern for profiling metrics
SELECT
  pt.org_id,
  pt.profiling_name as task_name,
  pr.run_key,
  pr.run_start_time,
  dsf.field_name as column_name,
  fpr.metric_type,
  fpr.metric_value
FROM fact_profiling_result fpr
JOIN dim_profiling_run pr ON fpr.profiling_run_id = pr.profiling_run_id
JOIN dim_profiling_task pt ON pr.profiling_task_id = pt.profiling_task_id
JOIN dim_data_source_field dsf ON fpr.profiling_run_id = dsf.profiling_run_id
                                AND fpr.column_name = dsf.field_name
WHERE pt.org_id = '6inyp1FQ2QQkemoflBDG8e'
  AND fpr.metric_type IN ('DISTINCT_PERCENT', 'NULL_PERCENT')
ORDER BY pr.run_key DESC, dsf.field_name;
```

### Star Schema Join Pattern: Rule Validation

```sql
-- Standard join pattern for rule validation
SELECT
  pt.org_id,
  pt.profiling_name as task_name,
  pr.run_key,
  pr.run_start_time,
  rm.name as rule_name,
  rm.dimension,
  fom.output_name,
  SUM(CASE WHEN fcvf.value IN ('TRUE', '1', 'Valid') THEN fcvf.row_count ELSE 0 END) as valid_rows,
  SUM(fcvf.row_count) as total_rows
FROM fact_rule_output_mapping fom
JOIN dim_rule_mapplet rm ON fom.rule_mapplet_id = rm.rule_mapplet_id
JOIN dim_profiling_run pr ON fom.profiling_run_id = pr.profiling_run_id
JOIN dim_profiling_task pt ON pr.profiling_task_id = pt.profiling_task_id
JOIN fact_column_value_frequency fcvf ON fom.profiling_run_id = fcvf.profiling_run_id
                                       AND fom.column_name = fcvf.column_name
WHERE pt.org_id = '6inyp1FQ2QQkemoflBDG8e'
GROUP BY pt.org_id, pt.profiling_name, pr.run_key, pr.run_start_time, 
         rm.name, rm.dimension, fom.output_name
ORDER BY pr.run_key DESC, rm.name;
```

---

## Common Filters

### Filter by Organization

```sql
WHERE pt.org_id = '6inyp1FQ2QQkemoflBDG8e'
```

### Filter by Task

```sql
WHERE pt.profiling_task_id = 'c4b233b4-2684-4411-b3fa-c98dc5853af2'
-- OR
WHERE pt.profiling_name = 'CDQPrimer101'
```

### Filter by Run

```sql
WHERE pr.run_key = '7'
-- OR for latest run
WHERE pr.run_key = (SELECT MAX(run_key) FROM dim_profiling_run WHERE profiling_task_id = pt.profiling_task_id)
```

### Filter by Column

```sql
WHERE dsf.field_name = 'CUSTOMER_ID'
-- OR
WHERE fpr.column_name = 'CUSTOMER_ID'
```

### Filter by Rule

```sql
WHERE rm.name = 'Validate_Country'
```

### Filter by Dimension

```sql
WHERE rm.dimension IN ('VALIDITY', 'CONSISTENCY', 'COMPLETENESS')
```

---

## Advanced Queries

### Compare Latest Two Runs

```sql
-- Compare metrics between latest two runs
WITH RankedRuns AS (
  SELECT
    pr.profiling_task_id,
    pr.profiling_run_id,
    pr.run_key,
    pr.run_start_time,
    ROW_NUMBER() OVER (PARTITION BY pr.profiling_task_id ORDER BY pr.run_key DESC) as rn
  FROM dim_profiling_run pr
)
SELECT
  dsf.field_name,
  curr.run_key as current_run,
  curr_val.metric_value as current_value,
  prev.run_key as previous_run,
  prev_val.metric_value as previous_value,
  (curr_val.metric_value - prev_val.metric_value) as change
FROM RankedRuns curr
JOIN RankedRuns prev ON curr.profiling_task_id = prev.profiling_task_id AND prev.rn = 2
JOIN fact_profiling_result curr_val ON curr.profiling_run_id = curr_val.profiling_run_id
JOIN fact_profiling_result prev_val ON prev.profiling_run_id = prev_val.profiling_run_id
                                    AND curr_val.column_name = prev_val.column_name
                                    AND curr_val.metric_type = prev_val.metric_type
JOIN dim_data_source_field dsf ON curr_val.profiling_run_id = dsf.profiling_run_id
                                AND curr_val.column_name = dsf.field_name
WHERE curr.rn = 1
  AND curr_val.metric_type = 'DISTINCT_PERCENT'
ORDER BY ABS(curr_val.metric_value - prev_val.metric_value) DESC;
```

### Find Columns with Declining Quality

```sql
-- Identify columns where NULL_PERCENT is increasing
WITH RunComparison AS (
  SELECT
    fpr.column_name,
    pr.run_key,
    fpr.metric_value,
    LAG(fpr.metric_value) OVER (PARTITION BY fpr.column_name ORDER BY pr.run_key) as prev_value
  FROM fact_profiling_result fpr
  JOIN dim_profiling_run pr ON fpr.profiling_run_id = pr.profiling_run_id
  WHERE fpr.metric_type = 'NULL_PERCENT'
    AND pr.profiling_task_id = 'c4b233b4-2684-4411-b3fa-c98dc5853af2'
)
SELECT
  column_name,
  run_key,
  metric_value as current_null_percent,
  prev_value as previous_null_percent,
  (metric_value - prev_value) as increase
FROM RunComparison
WHERE prev_value IS NOT NULL
  AND metric_value > prev_value
ORDER BY (metric_value - prev_value) DESC;
```

---

## Tips for Using the Star Schema

1. **Always join through dim_profiling_run** when relating facts to tasks
2. **Use run_key for chronological ordering** (it's sortable as string)
3. **Filter by org_id early** for better query performance
4. **Use DISTINCT when counting across fact tables** to avoid duplicates
5. **Join fact_column_value_frequency for actual data values**
6. **Check both rule_mapplet_id and column_name** when joining rule outputs

---

## Interactive Learning in Reports UI

All queries in this document are available as **tooltips** in the Reports page:

- **Column headers**: Hover to see the base query for that metric
- **Data cells**: Hover to see the complete query with actual values filled in
- **Dimension cards**: Hover to see aggregation queries for dimension analytics
- **Trend arrows**: Hover to see historical trend queries

💡 **Pro tip**: Copy queries from tooltips and run them in your SQL client to explore the data further!
