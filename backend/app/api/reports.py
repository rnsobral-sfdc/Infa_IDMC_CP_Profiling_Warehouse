"""
Reports API - Data Quality Reports and Analytics
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, and_, or_
from typing import List, Optional
from datetime import datetime
import logging
from ..core.database import get_db
from ..core.connection_utils import get_active_org_id
from ..models import (
    DimProfilingTask, DimProfilingRun, FactProfilingResult,
    DimDataSourceField, DimRuleMapplet, FactRuleOutputMapping,
    FactColumnValueFrequency, FactColumnPattern, FactColumnDataType,
    DimRuleOccurrence
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/column-quality-metrics")
def get_column_quality_metrics(
    org_ids: Optional[str] = Query(None, description="Comma-separated org IDs"),
    task_ids: Optional[str] = Query(None, description="Comma-separated task IDs"),
    column_names: Optional[str] = Query(None, description="Comma-separated column names"),
    limit: int = Query(500, description="Maximum number of columns to return"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get data quality metrics for columns across profiling runs.

    Returns metrics for:
    - Uniqueness (DISTINCT_PERCENT)
    - Completeness (NULL_PERCENT)
    - Pattern cardinality
    - Data type cardinality

    Each metric includes current value and historical trend.
    """
    # Parse filters
    org_id_list = org_ids.split(',') if org_ids else None
    task_id_list = task_ids.split(',') if task_ids else None
    column_name_list = column_names.split(',') if column_names else None

    # Parse date filters (default to last 5 years)
    from datetime import datetime, timedelta
    if not end_date:
        end_dt = datetime.utcnow()
    else:
        end_dt = datetime.fromisoformat(end_date)

    if not start_date:
        start_dt = end_dt - timedelta(days=1825)  # 5 years
    else:
        start_dt = datetime.fromisoformat(start_date)

    # If no org filter specified, use active org
    if not org_id_list:
        active_org_id = get_active_org_id(db)
        if not active_org_id:
            return []
        org_id_list = [active_org_id]

    # Get all unique columns and their tasks
    # We need to get columns across ALL runs, not just the run where they were first discovered
    unique_columns_query = db.query(
        distinct(DimDataSourceField.field_name).label('column_name'),
        DimDataSourceField.profiling_task_id.label('task_id'),
        DimProfilingTask.profiling_name.label('task_name'),
        DimProfilingTask.org_id.label('org_id')
    ).join(
        DimProfilingTask,
        DimDataSourceField.profiling_task_id == DimProfilingTask.profiling_task_id
    ).filter(
        DimDataSourceField.org_id.in_(org_id_list)
    )

    if task_id_list:
        unique_columns_query = unique_columns_query.filter(DimDataSourceField.profiling_task_id.in_(task_id_list))

    if column_name_list:
        unique_columns_query = unique_columns_query.filter(DimDataSourceField.field_name.in_(column_name_list))

    unique_columns = unique_columns_query.all()

    # Get all runs for the relevant tasks
    runs_query = db.query(
        DimProfilingRun.profiling_run_id.label('run_id'),
        DimProfilingRun.run_key.label('run_key'),
        DimProfilingRun.run_start_time.label('run_date'),
        DimProfilingRun.profiling_task_id.label('task_id')
    ).filter(
        DimProfilingRun.run_start_time >= start_dt,
        DimProfilingRun.run_start_time <= end_dt
    )

    if task_id_list:
        runs_query = runs_query.filter(DimProfilingRun.profiling_task_id.in_(task_id_list))

    runs = runs_query.all()

    # Create a mapping of task_id -> list of runs
    task_runs = {}
    for run in runs:
        if run.task_id not in task_runs:
            task_runs[run.task_id] = []
        task_runs[run.task_id].append(run)

    # Build result: for each column, get metrics from all runs
    result = {}
    for col in unique_columns:
        key = (col.task_id, col.column_name)
        result[key] = {
            'task_id': col.task_id,
            'task_name': col.task_name,
            'org_id': col.org_id,
            'column_name': col.column_name,
            'runs': []
        }

        # Get all runs for this task
        runs_for_task = task_runs.get(col.task_id, [])

        for run in runs_for_task:
            # Get all metrics for this column in this run
            metrics = db.query(
                FactProfilingResult.metric_type,
                FactProfilingResult.metric_value
            ).filter(
                FactProfilingResult.profiling_run_id == run.run_id,
                FactProfilingResult.column_name == col.column_name
            ).all()

            # Skip this run if no metrics exist for this column
            if not metrics:
                continue

            # Build metrics dictionary
            metrics_dict = {m.metric_type: float(m.metric_value) if m.metric_value is not None else None for m in metrics}

            # Get pattern count
            pattern_count = db.query(func.count(distinct(FactColumnPattern.pattern_label))).filter(
                FactColumnPattern.profiling_run_id == run.run_id,
                FactColumnPattern.column_name == col.column_name
            ).scalar() or 0

            # Get data type count
            datatype_count = db.query(func.count(distinct(FactColumnDataType.inferred_datatype))).filter(
                FactColumnDataType.profiling_run_id == run.run_id,
                FactColumnDataType.column_name == col.column_name
            ).scalar() or 0

            result[key]['runs'].append({
                'run_id': run.run_id,
                'run_key': run.run_key,
                'run_date': run.run_date.isoformat() if run.run_date else None,
                'distinct_count': metrics_dict.get('DISTINCT_COUNT'),
                'distinct_percent': metrics_dict.get('DISTINCT_PERCENT'),
                'null_count': metrics_dict.get('NULL_COUNT'),
                'null_percent': metrics_dict.get('NULL_PERCENT'),
                'zero_count': metrics_dict.get('ZERO_COUNT'),
                'blank_count': metrics_dict.get('BLANK_COUNT'),
                'duplicate_count': metrics_dict.get('DUPLICATE_COUNT'),
                'total_rows': metrics_dict.get('TOTAL_ROWS'),
                'average': metrics_dict.get('AVG_VALUE'),  # Fixed: database uses AVG_VALUE
                'standard_deviation': metrics_dict.get('STD_DEVIATION'),  # Fixed: database uses STD_DEVIATION
                'pattern_count': pattern_count,
                'datatype_count': datatype_count
            })

    # Remove columns with no runs
    result = {k: v for k, v in result.items() if v['runs']}

    # Sort runs by run_key descending and calculate drift
    final_result = []
    for item in result.values():
        item['runs'] = sorted(item['runs'], key=lambda x: x['run_key'], reverse=True)

        # Calculate drift between latest and previous run
        if len(item['runs']) >= 2:
            latest = item['runs'][0]
            previous = item['runs'][1]

            def calculate_drift(current, prev):
                """Calculate percentage drift. Returns None if either value is None."""
                if current is None or prev is None:
                    return None
                if prev == 0:
                    # If previous was 0 and current is not, consider it 100% drift
                    return 100.0 if current != 0 else 0.0
                return ((current - prev) / prev) * 100.0

            item['drift_distinct_count'] = calculate_drift(latest.get('distinct_count'), previous.get('distinct_count'))
            item['drift_null_count'] = calculate_drift(latest.get('null_count'), previous.get('null_count'))
            item['drift_zero_count'] = calculate_drift(latest.get('zero_count'), previous.get('zero_count'))
            item['drift_blank_count'] = calculate_drift(latest.get('blank_count'), previous.get('blank_count'))
            item['drift_duplicate_count'] = calculate_drift(latest.get('duplicate_count'), previous.get('duplicate_count'))
            item['drift_total_rows'] = calculate_drift(latest.get('total_rows'), previous.get('total_rows'))
            item['drift_average'] = calculate_drift(latest.get('average'), previous.get('average'))
            item['drift_standard_deviation'] = calculate_drift(latest.get('standard_deviation'), previous.get('standard_deviation'))
        else:
            # No drift if only one data point
            item['drift_distinct_count'] = None
            item['drift_null_count'] = None
            item['drift_zero_count'] = None
            item['drift_blank_count'] = None
            item['drift_duplicate_count'] = None
            item['drift_total_rows'] = None
            item['drift_average'] = None
            item['drift_standard_deviation'] = None

        # Latest run metrics
        latest = item['runs'][0] if item['runs'] else None
        item['latest_distinct_count'] = latest.get('distinct_count') if latest else None
        item['latest_distinct_percent'] = latest.get('distinct_percent') if latest else None
        item['latest_null_count'] = latest.get('null_count') if latest else None
        item['latest_null_percent'] = latest.get('null_percent') if latest else None
        item['latest_zero_count'] = latest.get('zero_count') if latest else None
        item['latest_blank_count'] = latest.get('blank_count') if latest else None
        item['latest_duplicate_count'] = latest.get('duplicate_count') if latest else None
        item['latest_total_rows'] = latest.get('total_rows') if latest else None
        item['latest_average'] = latest.get('average') if latest else None
        item['latest_standard_deviation'] = latest.get('standard_deviation') if latest else None
        item['latest_pattern_count'] = latest.get('pattern_count') if latest else None
        item['latest_datatype_count'] = latest.get('datatype_count') if latest else None
        item['latest_run_key'] = latest.get('run_key') if latest else ''

        final_result.append(item)

    # Sort by latest run_key descending to show most recent results first
    final_result = sorted(final_result, key=lambda x: x.get('latest_run_key', ''), reverse=True)

    # Apply limit
    return final_result[:limit]


@router.get("/rule-validation-metrics")
def get_rule_validation_metrics(
    org_ids: Optional[str] = Query(None, description="Comma-separated org IDs"),
    task_ids: Optional[str] = Query(None, description="Comma-separated task IDs"),
    rule_names: Optional[str] = Query(None, description="Comma-separated rule names"),
    limit: int = Query(500, description="Maximum number of rules to return"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get validation metrics for rules with boolean/binary outputs.

    Identifies rules with outputs containing only:
    - TRUE/FALSE
    - 0/1
    - Valid/Invalid

    Returns validation scores, thresholds, and dimensions for heat mapping.
    """
    # Parse filters
    org_id_list = org_ids.split(',') if org_ids else None
    task_id_list = task_ids.split(',') if task_ids else None
    rule_name_list = rule_names.split(',') if rule_names else None

    # Parse date filters (default to last 5 years)
    from datetime import datetime, timedelta
    if not end_date:
        end_dt = datetime.utcnow()
    else:
        end_dt = datetime.fromisoformat(end_date)

    if not start_date:
        start_dt = end_dt - timedelta(days=1825)  # 5 years
    else:
        start_dt = datetime.fromisoformat(start_date)

    # If no org filter specified, use active org
    if not org_id_list:
        active_org_id = get_active_org_id(db)
        if not active_org_id:
            return []
        org_id_list = [active_org_id]

    # Get all rule outputs across runs
    outputs_query = db.query(
        DimRuleMapplet.rule_mapplet_id,
        DimRuleMapplet.name.label('rule_name'),
        DimRuleMapplet.dimension.label('rule_dimension'),
        DimRuleMapplet.profiling_task_id.label('task_id'),
        DimProfilingTask.profiling_name.label('task_name'),
        DimProfilingTask.org_id.label('org_id'),
        FactRuleOutputMapping.out_field_name.label('output_name'),
        FactRuleOutputMapping.mapping_id,
        DimProfilingRun.run_key,
        DimProfilingRun.run_start_time.label('run_date'),
        DimProfilingRun.profiling_run_id.label('run_id')
    ).join(
        FactRuleOutputMapping,
        DimRuleMapplet.rule_mapplet_id == FactRuleOutputMapping.rule_mapplet_id
    ).join(
        DimProfilingRun,
        FactRuleOutputMapping.profiling_run_id == DimProfilingRun.profiling_run_id
    ).join(
        DimProfilingTask,
        DimProfilingRun.profiling_task_id == DimProfilingTask.profiling_task_id
    ).filter(
        DimRuleMapplet.org_id.in_(org_id_list),
        DimProfilingRun.run_start_time >= start_dt,
        DimProfilingRun.run_start_time <= end_dt
    )

    if task_id_list:
        outputs_query = outputs_query.filter(DimRuleMapplet.profiling_task_id.in_(task_id_list))

    if rule_name_list:
        outputs_query = outputs_query.filter(DimRuleMapplet.name.in_(rule_name_list))

    outputs = outputs_query.all()

    # Fetch ALL frequencies for all outputs in a single query (performance optimization)
    run_ids = [o.run_id for o in outputs]
    output_names = list(set([o.output_name for o in outputs]))

    all_frequencies = db.query(
        FactColumnValueFrequency.profiling_run_id,
        FactColumnValueFrequency.column_name,
        FactColumnValueFrequency.column_value,
        FactColumnValueFrequency.frequency
    ).filter(
        FactColumnValueFrequency.profiling_run_id.in_(run_ids),
        FactColumnValueFrequency.column_name.in_(output_names)
    ).all()

    # Index frequencies by (run_id, column_name) for fast lookup
    freq_index = {}
    for freq in all_frequencies:
        key = (freq.profiling_run_id, freq.column_name)
        if key not in freq_index:
            freq_index[key] = []
        freq_index[key].append(freq)

    # Fetch ALL total_rows in a single query (performance optimization)
    all_total_rows = db.query(
        FactProfilingResult.profiling_run_id,
        FactProfilingResult.column_name,
        FactProfilingResult.metric_value
    ).filter(
        FactProfilingResult.profiling_run_id.in_(run_ids),
        FactProfilingResult.column_name.in_(output_names),
        FactProfilingResult.metric_type == 'TOTAL_ROWS'
    ).all()

    # Index total_rows by (run_id, column_name) for fast lookup
    total_rows_index = {}
    for tr in all_total_rows:
        key = (tr.profiling_run_id, tr.column_name)
        total_rows_index[key] = int(tr.metric_value) if tr.metric_value else 0

    # Fetch ALL rule occurrences in a single query (performance optimization)
    rule_mapplet_ids = list(set([o.rule_mapplet_id for o in outputs]))
    all_occurrences = db.query(DimRuleOccurrence).filter(
        DimRuleOccurrence.rule_mapplet_id.in_(rule_mapplet_ids)
    ).all()

    print(f"DEBUG: Found {len(all_occurrences)} rule occurrences for {len(rule_mapplet_ids)} rule mapplets")
    if len(all_occurrences) == 0 and len(rule_mapplet_ids) > 0:
        print(f"WARNING: No rule occurrences found. Sample rule_mapplet_ids: {rule_mapplet_ids[:3]}")

    # Index occurrences by rule_mapplet_id for fast lookup
    occurrence_index = {occ.rule_mapplet_id: occ for occ in all_occurrences}

    # Fetch input fields (source fields) for each rule mapplet
    from ..models import FactRuleInputMapping
    all_input_mappings = db.query(
        FactRuleInputMapping.rule_mapplet_id,
        FactRuleInputMapping.data_source_field_name
    ).filter(
        FactRuleInputMapping.rule_mapplet_id.in_(rule_mapplet_ids)
    ).distinct().all()

    # Index input fields by rule_mapplet_id (can have multiple source fields per rule)
    input_fields_index = {}
    for mapping in all_input_mappings:
        if mapping.rule_mapplet_id not in input_fields_index:
            input_fields_index[mapping.rule_mapplet_id] = []
        if mapping.data_source_field_name:
            input_fields_index[mapping.rule_mapplet_id].append(mapping.data_source_field_name)

    result = []

    for output in outputs:
        # Get frequencies from pre-fetched index
        freq_key = (output.run_id, output.output_name)
        frequencies = freq_index.get(freq_key, [])

        if not frequencies:
            continue

        # Check if this is a boolean/binary output
        values = [str(f.column_value).upper() if f.column_value else 'NULL' for f in frequencies]

        # Remove empty strings from values for boolean checking
        non_empty_values = [v for v in values if v and v != 'NULL']

        # If all values are NULL or empty, skip
        if not non_empty_values:
            continue

        is_boolean = (
            set(values).issubset({'TRUE', 'FALSE', 'NULL', ''}) or
            set(values).issubset({'1', '0', 'NULL', ''}) or
            set(values).issubset({'VALID', 'INVALID', 'NULL', ''})
        )

        if not is_boolean:
            continue

        # Calculate validation metrics
        # IMPORTANT: Total rows should be sum of ALL frequencies (this is the source of truth)
        total_rows_from_freq = sum(f.frequency for f in frequencies)

        # Also get total_rows from metrics table for comparison
        total_rows_key = (output.run_id, output.output_name)
        total_rows_from_metric = total_rows_index.get(total_rows_key, 0)

        # Use frequency sum as the source of truth (it's the actual count)
        total_rows = total_rows_from_freq if total_rows_from_freq > 0 else total_rows_from_metric

        # Calculate valid rows
        valid_rows = 0
        invalid_rows = 0
        for f in frequencies:
            val_upper = str(f.column_value).upper() if f.column_value else ''
            if val_upper in ['TRUE', '1', 'VALID']:
                valid_rows += f.frequency
            elif val_upper in ['FALSE', '0', 'INVALID']:
                invalid_rows += f.frequency

        # Validation: valid + invalid should equal total
        calculated_total = valid_rows + invalid_rows
        if calculated_total != total_rows and total_rows > 0:
            # There are NULL or other values, adjust invalid to include them
            invalid_rows = total_rows - valid_rows

        # Ensure valid_rows never exceeds total_rows
        if valid_rows > total_rows:
            print(f"WARNING: valid_rows ({valid_rows}) > total_rows ({total_rows}) for {output.rule_name}/{output.output_name}")
            valid_rows = total_rows
            invalid_rows = 0

        score = (valid_rows / total_rows * 100) if total_rows > 0 else 0

        # Get rule occurrence thresholds from pre-fetched index
        # Note: threshold = lower/minimum acceptable, target = higher/desired value
        occurrence = occurrence_index.get(output.rule_mapplet_id)
        has_occurrence = occurrence is not None

        # Use occurrence thresholds if available, otherwise use defaults (90/70)
        # Only rules linked to profiling as "rule occurrences" have custom thresholds
        if has_occurrence:
            threshold_low = occurrence.threshold if occurrence.threshold else 70.0
            threshold_high = occurrence.target if occurrence.target else 90.0
        else:
            # Default thresholds for rules without rule occurrence configuration
            threshold_low = 70.0
            threshold_high = 90.0

        # Get dimension from DimRuleMapplet (already in the query result)
        dimension = output.rule_dimension if output.rule_dimension else 'N/A'

        # Get source/input fields for this rule
        source_fields = input_fields_index.get(output.rule_mapplet_id, [])

        result.append({
            'task_id': output.task_id,
            'task_name': output.task_name,
            'org_id': output.org_id,
            'rule_name': output.rule_name,
            'output_name': output.output_name,
            'dimension': dimension,
            'source_fields': source_fields,  # List of input field names
            'run_id': output.run_id,
            'run_key': output.run_key,
            'run_date': output.run_date.isoformat() if output.run_date else None,
            'total_rows': total_rows,
            'valid_rows': valid_rows,
            'invalid_rows': invalid_rows,
            'score': round(score, 2),
            'threshold_high': threshold_high,
            'threshold_low': threshold_low,
            'has_rule_occurrence': has_occurrence  # Flag to show if thresholds are custom or default
        })

    # If no results, return empty list
    if not result:
        return []

    # Group by unique rules (task_id + rule_name + output_name)
    grouped = {}
    for metric in result:
        key = f"{metric['task_id']}-{metric['rule_name']}-{metric['output_name']}"
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(metric)

    # Sort each group by run_key descending (latest first)
    for key in grouped:
        grouped[key] = sorted(grouped[key], key=lambda x: x.get('run_key', ''), reverse=True)

    # Sort groups by latest run_key (most recent execution first)
    sorted_groups = sorted(
        grouped.items(),
        key=lambda x: x[1][0].get('run_key', '') if x[1] else '',
        reverse=True
    )

    # Take first N groups (limit)
    # For each group, return ONLY the latest run with minimal historical data for trending
    limited_groups = sorted_groups[:limit]
    final_result = []
    for key, metrics in limited_groups:
        if not metrics:
            continue

        # Latest run (first in sorted list)
        latest = metrics[0]

        # Add minimal runs data for sparkline trending (only what's needed)
        latest['runs'] = [
            {
                'run_key': m['run_key'],
                'score': m['score'],
                'run_date': m['run_date']
            }
            for m in metrics
        ]

        final_result.append(latest)

    return final_result


@router.get("/filter-options")
def get_filter_options(db: Session = Depends(get_db)):
    """
    Get available filter options for reports.

    Returns:
    - Organization IDs
    - Profiling tasks
    - Rule names
    - Column names
    """
    # Get all org IDs (not just active connection)
    org_ids = db.query(
        DimProfilingTask.org_id
    ).filter(
        DimProfilingTask.org_id.isnot(None)
    ).distinct().all()

    # Get all tasks
    tasks = db.query(
        DimProfilingTask.profiling_task_id,
        DimProfilingTask.profiling_name,
        DimProfilingTask.org_id
    ).all()

    # Get all rule names
    rules = db.query(
        DimRuleMapplet.name
    ).distinct().all()

    # Get all column names
    columns = db.query(
        DimDataSourceField.field_name
    ).distinct().all()

    return {
        'org_ids': [org_id[0] for org_id in org_ids],
        'tasks': [{'id': t[0], 'name': t[1], 'org_id': t[2]} for t in tasks],
        'rules': [rule[0] for rule in rules],
        'columns': [col[0] for col in columns]
    }
