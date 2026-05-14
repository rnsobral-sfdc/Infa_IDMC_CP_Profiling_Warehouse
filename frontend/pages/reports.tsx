import React, { useState, useEffect } from 'react';
import {
  FluentProvider,
  webLightTheme,
  Text as FluentText,
  Button,
  Dropdown,
  Option,
  Card,
  Spinner,
  Badge,
  Divider,
  makeStyles,
  shorthands,
  tokens,
  Tooltip
} from '@fluentui/react-components';
import { Copy24Regular, ChartMultiple24Regular, Info16Regular } from '@fluentui/react-icons';
import Layout from '../src/components/Layout';
import { SQLQueryPopover } from '../src/components/SQLQueryPopover';
import { ScoreTrendChart } from '../src/components/ScoreTrendChart';
import { PageHeader } from '../src/components/PageHeader';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    ...shorthands.padding('24px')
  },
  filterPanel: {
    display: 'flex',
    flexDirection: 'row',
    ...shorthands.gap('16px'),
    alignItems: 'flex-end',
    flexWrap: 'wrap'
  },
  filterControl: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    minWidth: '200px'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px')
  },
  dimensionCard: {
    ...shorthands.padding('16px'),
    textAlign: 'center',
    backgroundColor: tokens.colorNeutralBackground2
  },
  dimensionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    ...shorthands.gap('16px'),
    marginBottom: '24px'
  },
  tableWrapper: {
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1)
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    textAlign: 'left',
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground2,
    fontWeight: 600,
    ...shorthands.borderBottom('2px', 'solid', tokens.colorNeutralStroke1)
  },
  td: {
    ...shorthands.padding('10px', '12px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1)
  },
  heatCell: {
    textAlign: 'center',
    fontWeight: 600
  },
  sparklineCell: {
    minWidth: '100px',
    maxWidth: '150px'
  },
  greenCell: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  yellowCell: {
    backgroundColor: '#fff3cd',
    color: '#856404'
  },
  redCell: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  noColorCell: {
    backgroundColor: 'transparent'
  },
  donutContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
    position: 'relative'
  },
  donutText: {
    position: 'absolute',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  thContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('8px'),
    ':hover .sql-popover': {
      opacity: '1'
    }
  },
  sqlPopoverWrapper: {
    opacity: 0,
    transition: 'opacity 0.2s ease',
    display: 'flex',
    alignItems: 'center'
  },
  copyButton: {
    minWidth: 'auto',
    padding: '4px',
    height: '24px'
  },
  sqlTooltip: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '11px',
    maxWidth: '600px',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('8px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium)
  }
});

interface FilterOptions {
  org_ids: string[];
  tasks: { id: string; name: string; org_id: string }[];
  rules: string[];
  columns: string[];
}

interface ColumnQualityMetric {
  task_id: string;
  task_name: string;
  org_id: string;
  column_name: string;
  latest_distinct_percent: number | null;
  latest_null_percent: number | null;
  latest_pattern_count: number;
  latest_datatype_count: number;
  runs: Array<{
    run_id: string;
    run_key: string;
    run_date: string | null;
    distinct_percent: number | null;
    null_percent: number | null;
    pattern_count: number;
    datatype_count: number;
  }>;
}

interface RuleValidationMetric {
  task_id: string;
  task_name: string;
  org_id: string;
  rule_name: string;
  output_name: string;
  dimension: string | null;
  run_id: string;
  run_key: string;
  run_date: string | null;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  score: number;
  threshold_high: number | null;
  threshold_low: number | null;
  runs?: RuleValidationMetric[];  // Historical runs for sparkline trending
}

const Reports: React.FC = () => {
  const styles = useStyles();
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ org_ids: [], tasks: [], rules: [], columns: [] });
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const [columnMetrics, setColumnMetrics] = useState<ColumnQualityMetric[]>([]);
  const [ruleMetrics, setRuleMetrics] = useState<RuleValidationMetric[]>([]);

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [columnLimit, setColumnLimit] = useState(500);
  const [ruleLimit, setRuleLimit] = useState(500);
  const [hasMoreColumns, setHasMoreColumns] = useState(false);
  const [hasMoreRules, setHasMoreRules] = useState(false);

  // Date range filter (default last 5 years to capture historical data)
  const getDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 5);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  // Sorting state
  const [columnSortField, setColumnSortField] = useState<string>('latest_run_key');
  const [columnSortDirection, setColumnSortDirection] = useState<'asc' | 'desc'>('desc');
  const [ruleSortField, setRuleSortField] = useState<string>('run_key');
  const [ruleSortDirection, setRuleSortDirection] = useState<'asc' | 'desc'>('desc');

  // Helper component to wrap cell content with SQL popover
  const CellWithSQL = ({ children, query, columnName }: { children: React.ReactNode; query: string; columnName: string }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span style={{ flex: 1 }}>{children}</span>
        <div style={{
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
          display: 'flex',
          alignItems: 'center'
        }}>
          <SQLQueryPopover
            query={query}
            title="Star Schema SQL Query"
            columnName={columnName}
          />
        </div>
      </div>
    );
  };

  // Column order state
  const [columnTableOrder, setColumnTableOrder] = useState([
    'org_id', 'task_name', 'column_name', 'execution_time',
    'total_rows', 'drift_total_rows',
    'distinct_count', 'drift_distinct_count',
    'null_count', 'drift_null_count',
    'zero_count', 'drift_zero_count',
    'blank_count', 'drift_blank_count',
    'duplicate_count', 'drift_duplicate_count',
    'average', 'drift_average',
    'standard_deviation', 'drift_standard_deviation',
    'uniqueness', 'completeness', 'patterns', 'datatypes',
    'trend_uniqueness', 'trend_completeness'
  ]);
  const [ruleTableOrder, setRuleTableOrder] = useState([
    'org_id', 'task_name', 'rule_name', 'output_name', 'source_fields', 'dimension',
    'execution_time', 'score', 'total_rows', 'valid_rows', 'invalid_rows',
    'threshold_high', 'threshold_low', 'trend'
  ]);

  // Drag state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [draggedRuleColumn, setDraggedRuleColumn] = useState<string | null>(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (!loadingFilters) {
      loadData();
    }
  }, [selectedOrgIds, selectedTasks, selectedRules, selectedColumns, loadingFilters, columnLimit, ruleLimit, dateRange, columnSortField, columnSortDirection, ruleSortField, ruleSortDirection]);

  const loadFilterOptions = async () => {
    try {
      const response = await fetch('http://localhost:8000/reports/filter-options');
      const data = await response.json();
      setFilterOptions(data);

      // Auto-select the org if there's only one
      if (data.org_ids && data.org_ids.length === 1 && selectedOrgIds.length === 0) {
        setSelectedOrgIds(data.org_ids);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Sorting handlers
  const handleColumnSort = (field: string) => {
    if (columnSortField === field) {
      setColumnSortDirection(columnSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setColumnSortField(field);
      setColumnSortDirection('desc');
    }
  };

  const handleRuleSort = (field: string) => {
    if (ruleSortField === field) {
      setRuleSortDirection(ruleSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRuleSortField(field);
      setRuleSortDirection('desc');
    }
  };

  // Column reorder handlers
  const handleColumnDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleColumnDragOver = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) return;

    const currentOrder = [...columnTableOrder];
    const draggedIdx = currentOrder.indexOf(draggedColumn);
    const targetIdx = currentOrder.indexOf(targetColumnId);

    currentOrder.splice(draggedIdx, 1);
    currentOrder.splice(targetIdx, 0, draggedColumn);

    setColumnTableOrder(currentOrder);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
  };

  const handleRuleDragStart = (columnId: string) => {
    setDraggedRuleColumn(columnId);
  };

  const handleRuleDragOver = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedRuleColumn || draggedRuleColumn === targetColumnId) return;

    const currentOrder = [...ruleTableOrder];
    const draggedIdx = currentOrder.indexOf(draggedRuleColumn);
    const targetIdx = currentOrder.indexOf(targetColumnId);

    currentOrder.splice(draggedIdx, 1);
    currentOrder.splice(targetIdx, 0, draggedRuleColumn);

    setRuleTableOrder(currentOrder);
  };

  const handleRuleDragEnd = () => {
    setDraggedRuleColumn(null);
  };

  // Sort function
  const sortData = <T extends any>(data: T[], sortField: string, sortDirection: 'asc' | 'desc'): T[] => {
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      // Convert to comparable values
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const loadData = async () => {
    setLoadingData(true);
    try {
      const orgIds = selectedOrgIds.join(',');
      const taskIds = selectedTasks.join(',');
      const ruleNames = selectedRules.join(',');
      const columnNames = selectedColumns.join(',');

      const columnParams = new URLSearchParams();
      if (orgIds) columnParams.append('org_ids', orgIds);
      if (taskIds) columnParams.append('task_ids', taskIds);
      if (columnNames) columnParams.append('column_names', columnNames);
      columnParams.append('limit', columnLimit.toString());
      columnParams.append('start_date', dateRange.start);
      columnParams.append('end_date', dateRange.end);

      const columnResponse = await fetch(`http://localhost:8000/reports/column-quality-metrics?${columnParams}`);
      const columnData = await columnResponse.json();
      const columns = Array.isArray(columnData) ? columnData : [];
      setColumnMetrics(sortData(columns, columnSortField, columnSortDirection));
      setHasMoreColumns(columns.length === columnLimit);

      const ruleParams = new URLSearchParams();
      if (orgIds) ruleParams.append('org_ids', orgIds);
      if (taskIds) ruleParams.append('task_ids', taskIds);
      if (ruleNames) ruleParams.append('rule_names', ruleNames);
      ruleParams.append('limit', ruleLimit.toString());
      ruleParams.append('start_date', dateRange.start);
      ruleParams.append('end_date', dateRange.end);

      const ruleResponse = await fetch(`http://localhost:8000/reports/rule-validation-metrics?${ruleParams}`);
      const ruleData = await ruleResponse.json();
      const rules = Array.isArray(ruleData) ? ruleData : [];
      setRuleMetrics(sortData(rules, ruleSortField, ruleSortDirection));
      setHasMoreRules(rules.length === ruleLimit);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getUniquenessColor = (distinctPercent: number | null): string => {
    if (distinctPercent === null) return styles.noColorCell;
    if (distinctPercent === 100) return styles.greenCell;
    if (distinctPercent > 95) return styles.yellowCell;
    if (distinctPercent > 90) return styles.redCell;
    return styles.noColorCell;
  };

  const getCompletenessColor = (nullPercent: number | null): string => {
    if (nullPercent === null) return styles.noColorCell;
    if (nullPercent < 1) return styles.greenCell;
    if (nullPercent < 5) return styles.yellowCell;
    return styles.noColorCell;
  };

  const getValidationColor = (score: number, thresholdHigh: number | null, thresholdLow: number | null): string => {
    if (thresholdHigh !== null && score > thresholdHigh) return styles.greenCell;
    if (thresholdLow !== null && thresholdHigh !== null && score >= thresholdLow && score <= thresholdHigh) return styles.yellowCell;
    if (thresholdLow !== null && score < thresholdLow) return styles.redCell;
    return styles.noColorCell;
  };

  const getDriftColor = (drift: number | null): string => {
    if (drift === null) return styles.noColorCell;
    const absDrift = Math.abs(drift);
    if (absDrift > 10) return styles.redCell;
    if (absDrift > 5) return styles.yellowCell;
    return styles.noColorCell;
  };

  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return { direction: 'flat', arrow: '→', color: '#605E5C' };

    const first = data[0];
    const last = data[data.length - 1];
    const change = last - first;
    const percentChange = first !== 0 ? Math.abs((change / first) * 100) : 0;

    // Consider < 5% change as flat
    if (percentChange < 5) {
      return { direction: 'flat', arrow: '→', color: '#605E5C' };
    } else if (change > 0) {
      return { direction: 'up', arrow: '↑', color: '#107C10' };
    } else {
      return { direction: 'down', arrow: '↓', color: '#D13438' };
    }
  };

  const renderSparkline = (runs: ColumnQualityMetric['runs'], metricKey: 'distinct_percent' | 'null_percent') => {
    // Need at least 1 run to show a sparkline (even if flat line)
    if (!runs || runs.length === 0) return <FluentText size={200}>No Data</FluentText>;

    const sortedRuns = [...runs].sort((a, b) => a.run_key.localeCompare(b.run_key));
    // Extract metric values
    const data = sortedRuns.map(r => {
      const val = r[metricKey];
      return val !== null && val !== undefined ? val : null;
    });

    // If all values are null/undefined, show No Data
    const hasData = data.some(v => v !== null && v !== undefined);
    if (!hasData) return <FluentText size={200}>No Data</FluentText>;

    // Replace null values with 0 for trend calculation
    const dataForTrend = data.map(v => v !== null && v !== undefined ? v : 0);
    const trend = calculateTrend(dataForTrend);

    // Create tooltip data with dates
    const tooltipData = sortedRuns.map((run, idx) => ({
      value: data[idx] !== null ? data[idx] : 0,
      date: run.run_date ? new Date(run.run_date).toLocaleString() : `Run ${run.run_key}`,
      runKey: run.run_key
    }));

    return (
      <div title={tooltipData.map(t => `${t.date}: ${t.value.toFixed(2)}%`).join('\n')}>
        <FluentText size={300} weight="semibold" style={{ color: trend.color, fontSize: '24px' }}>
          {trend.arrow}
        </FluentText>
      </div>
    );
  };

  const renderValidationSparkline = (metrics: RuleValidationMetric[]) => {
    // Need at least 1 metric to show a sparkline (even if flat line)
    if (!metrics || metrics.length === 0) return <FluentText size={200}>No Data</FluentText>;

    const sortedMetrics = [...metrics].sort((a, b) => a.run_key.localeCompare(b.run_key));
    const data = sortedMetrics.map(m => m.score ?? 0);

    const trend = calculateTrend(data);

    // Create tooltip data with dates
    const tooltipData = sortedMetrics.map((metric, idx) => ({
      value: data[idx],
      date: metric.run_date ? new Date(metric.run_date).toLocaleString() : `Run ${metric.run_key}`,
      runKey: metric.run_key
    }));

    return (
      <div title={tooltipData.map(t => `${t.date}: ${t.value.toFixed(2)}%`).join('\n')}>
        <FluentText size={300} weight="semibold" style={{ color: trend.color, fontSize: '24px' }}>
          {trend.arrow}
        </FluentText>
      </div>
    );
  };

  const renderDonut = (score: number, color: string) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className={styles.donutContainer}>
        <svg width="80" height="80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke={tokens.colorNeutralStroke2} strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div className={styles.donutText}>{score.toFixed(0)}%</div>
      </div>
    );
  };

  // Group rule metrics by dimension and calculate averages with historical trend
  const dimensionStats: Record<string, { count: number; totalScore: number; avgScore: number; historicalScores: number[] }> = {};

  // First, group all metrics by dimension and run_key to calculate average per run
  const dimensionByRun: Record<string, Record<string, { total: number; count: number }>> = {};
  ruleMetrics.forEach(metric => {
    const dim = metric.dimension || 'Unknown';
    const runKey = metric.run_key || 'unknown';

    if (!dimensionByRun[dim]) {
      dimensionByRun[dim] = {};
    }
    if (!dimensionByRun[dim][runKey]) {
      dimensionByRun[dim][runKey] = { total: 0, count: 0 };
    }
    dimensionByRun[dim][runKey].total += metric.score;
    dimensionByRun[dim][runKey].count++;
  });

  // Calculate average scores per dimension per run
  Object.keys(dimensionByRun).forEach(dim => {
    const runKeys = Object.keys(dimensionByRun[dim]).sort();
    const historicalScores = runKeys.map(runKey => {
      const runData = dimensionByRun[dim][runKey];
      return runData.total / runData.count;
    });

    // Calculate overall stats
    const totalScore = historicalScores.reduce((sum, score) => sum + score, 0);
    const avgScore = totalScore / historicalScores.length;

    dimensionStats[dim] = {
      count: Object.values(dimensionByRun[dim]).reduce((sum, run) => sum + run.count, 0),
      totalScore: totalScore,
      avgScore: avgScore,
      historicalScores: historicalScores
    };
  });

  // Note: Backend already groups and returns one row per rule with runs[] array
  // No need to group here anymore - each metric IS the latest with runs[] for trending

  return (
    <Layout>
      <FluentProvider theme={webLightTheme}>
        <div className={styles.container}>
          <PageHeader
            title="Data Quality Reports"
            subtitle="Analyze data quality metrics across profiling runs with heat maps and trend lines. Hover over column headers and cells to see SQL queries for the star schema."
          />

          {/* Filter Panel */}
          <div className={styles.filterPanel}>
            <div className={styles.filterControl}>
              <FluentText size={300} weight="semibold">Organization</FluentText>
              <Dropdown
                placeholder="All organizations"
                multiselect
                value={selectedOrgIds.length > 0 ? `${selectedOrgIds.length} selected` : 'All organizations'}
                selectedOptions={selectedOrgIds}
                onOptionSelect={(_, data) => {
                  setSelectedOrgIds(data.selectedOptions);
                }}
                disabled={loadingFilters}
              >
                {filterOptions.org_ids.map(orgId => (
                  <Option key={orgId} value={orgId}>
                    {orgId}
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.filterControl}>
              <FluentText size={300} weight="semibold">Profiling Tasks</FluentText>
              <Dropdown
                placeholder="All tasks"
                multiselect
                value={selectedTasks.length > 0 ? `${selectedTasks.length} selected` : 'All tasks'}
                selectedOptions={selectedTasks}
                onOptionSelect={(_, data) => {
                  setSelectedTasks(data.selectedOptions);
                }}
                disabled={loadingFilters}
              >
                {filterOptions.tasks.map(task => (
                  <Option key={task.id} value={task.id}>
                    {task.name} ({task.org_id})
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.filterControl}>
              <FluentText size={300} weight="semibold">Rule Names</FluentText>
              <Dropdown
                placeholder="All rules"
                multiselect
                value={selectedRules.length > 0 ? `${selectedRules.length} selected` : 'All rules'}
                selectedOptions={selectedRules}
                onOptionSelect={(_, data) => {
                  setSelectedRules(data.selectedOptions);
                }}
                disabled={loadingFilters}
              >
                {filterOptions.rules.map(rule => (
                  <Option key={rule} value={rule}>
                    {rule}
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.filterControl}>
              <FluentText size={300} weight="semibold">Column Names</FluentText>
              <Dropdown
                placeholder="All columns"
                multiselect
                value={selectedColumns.length > 0 ? `${selectedColumns.length} selected` : 'All columns'}
                selectedOptions={selectedColumns}
                onOptionSelect={(_, data) => {
                  setSelectedColumns(data.selectedOptions);
                }}
                disabled={loadingFilters}
              >
                {filterOptions.columns.map(column => (
                  <Option key={column} value={column}>
                    {column}
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.filterControl}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FluentText size={300} weight="semibold">Date Range</FluentText>
                <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  (Default: Last 5 years)
                </FluentText>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <FluentText size={200}>to</FluentText>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
            </div>

            <Button
              appearance="primary"
              onClick={() => {
                setSelectedOrgIds([]);
                setSelectedTasks([]);
                setSelectedRules([]);
                setSelectedColumns([]);
                setDateRange(getDefaultDateRange());
              }}
              disabled={selectedOrgIds.length === 0 && selectedTasks.length === 0 && selectedRules.length === 0 && selectedColumns.length === 0}
            >
              Clear Filters
            </Button>
          </div>

          <Divider />

          {loadingData ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Spinner label="Loading report data..." />
            </div>
          ) : (
            <>
              {/* Rule Validation Heat Map */}
              <div className={styles.section}>
                <FluentText size={500} weight="semibold">
                  Rule Validation Metrics ({ruleMetrics.length} unique rules)
                </FluentText>
                <FluentText size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                  Validation scores for rules with boolean/binary outputs (TRUE/FALSE, 0/1, Valid/Invalid).
                  {ruleMetrics.length > 0 && ` Showing top ${ruleMetrics.length} rules sorted by latest execution.`}
                </FluentText>

                {ruleMetrics.length === 0 ? (
                  <Card>
                    <FluentText>No rule validation metrics found. Ensure rules with boolean outputs are profiled.</FluentText>
                  </Card>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          {ruleTableOrder.map(colId => {
                            const columnInfo = {
                              org_id: { label: 'Org ID', field: 'org_id', tooltip: 'SELECT org_id FROM dim_profiling_task' },
                              task_name: { label: 'Task', field: 'task_name', tooltip: 'SELECT profiling_name FROM dim_profiling_task' },
                              rule_name: { label: 'Rule', field: 'rule_name', tooltip: 'SELECT name FROM dim_rule_mapplet' },
                              output_name: { label: 'Output', field: 'output_name', tooltip: 'SELECT output_name FROM fact_rule_output_mapping' },
                              source_fields: { label: 'Source Fields', field: 'source_fields', tooltip: 'SELECT data_source_field_name FROM fact_rule_input_mapping - Input columns to the rule' },
                              dimension: { label: 'Dimension', field: 'dimension', tooltip: "SELECT dimension FROM dim_rule_mapplet WHERE dimension IN ('VALIDITY', 'CONSISTENCY', 'COMPLETENESS')" },
                              execution_time: { label: 'Execution Time', field: 'run_key', tooltip: 'SELECT run_start_time FROM dim_profiling_run' },
                              score: { label: 'Score (%)', field: 'score', tooltip: '(Valid Rows / Total Rows) * 100' },
                              total_rows: { label: 'Total Rows', field: 'total_rows', tooltip: 'SELECT SUM(row_count) FROM fact_column_value_frequency GROUP BY profiling_run_id, column_name' },
                              valid_rows: { label: 'Valid Rows', field: 'valid_rows', tooltip: "Count of rows where rule output = 'TRUE' or '1' or 'Valid'" },
                              invalid_rows: { label: 'Invalid Rows', field: 'invalid_rows', tooltip: "Count of rows where rule output = 'FALSE' or '0' or 'Invalid'" },
                              threshold_high: { label: 'Threshold High', field: 'threshold_high', tooltip: 'Target/desired quality score (default: 90%). From Rule Occurrence if configured in IDMC.' },
                              threshold_low: { label: 'Threshold Low', field: 'threshold_low', tooltip: 'Minimum acceptable quality score (default: 70%). From Rule Occurrence if configured in IDMC.' },
                              trend: { label: 'Trend', field: 'trend', tooltip: 'Calculated by comparing first and last run scores' }
                            }[colId];

                            if (!columnInfo) return null;

                            const isSorted = ruleSortField === columnInfo.field;
                            const sortIcon = isSorted ? (ruleSortDirection === 'asc' ? ' ▲' : ' ▼') : '';

                            return (
                              <th
                                key={colId}
                                className={styles.th}
                                draggable
                                onDragStart={() => handleRuleDragStart(colId)}
                                onDragOver={(e) => handleRuleDragOver(e, colId)}
                                onDragEnd={handleRuleDragEnd}
                                style={{ userSelect: 'none' }}
                              >
                                <div className={styles.thContainer}>
                                  <span
                                    onClick={() => handleRuleSort(columnInfo.field)}
                                    style={{ cursor: 'pointer' }}
                                    title="Click to sort • Drag header to reorder"
                                  >
                                    {columnInfo.label}{sortIcon}
                                  </span>
                                  <div className={`sql-popover ${styles.sqlPopoverWrapper}`}>
                                    <SQLQueryPopover
                                      query={columnInfo.tooltip}
                                      title="Star Schema SQL Query"
                                      columnName={columnInfo.label}
                                    />
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {ruleMetrics.map((latest) => {
                          // Backend returns latest run with runs[] array for trending
                          const metrics = latest.runs || [latest];
                          const key = `${latest.task_id}-${latest.rule_name}-${latest.output_name}`;
                          const ruleQuery = `-- Get rule details
SELECT rm.name, rm.dimension, rm.rule_type
FROM dim_rule_mapplet rm
WHERE rm.name = '${latest.rule_name}'`;

                          const outputQuery = `-- Get rule outputs with validation counts
SELECT
  fom.output_name,
  SUM(CASE WHEN fcvf.value IN ('TRUE', '1', 'Valid') THEN fcvf.row_count ELSE 0 END) as valid_rows,
  SUM(CASE WHEN fcvf.value IN ('FALSE', '0', 'Invalid') THEN fcvf.row_count ELSE 0 END) as invalid_rows,
  SUM(fcvf.row_count) as total_rows
FROM fact_rule_output_mapping fom
JOIN fact_column_value_frequency fcvf
  ON fom.profiling_run_id = fcvf.profiling_run_id
  AND fom.column_name = fcvf.column_name
WHERE fom.rule_mapplet_id IN (SELECT rule_mapplet_id FROM dim_rule_mapplet WHERE name = '${latest.rule_name}')
  AND fom.output_name = '${latest.output_name}'
GROUP BY fom.output_name`;

                          const trendQuery = `-- Get trend across runs
SELECT
  pr.run_key,
  pr.run_start_time,
  (valid_rows * 100.0 / total_rows) as score
FROM dim_profiling_run pr
JOIN fact_rule_output_mapping fom ON pr.profiling_run_id = fom.profiling_run_id
WHERE fom.rule_mapplet_id IN (SELECT rule_mapplet_id FROM dim_rule_mapplet WHERE name = '${latest.rule_name}')
ORDER BY pr.run_key DESC`;

                          const renderRuleCell = (colId: string) => {
                            switch (colId) {
                              case 'org_id':
                                return <td key={colId} className={styles.td}><FluentText size={200} style={{ fontFamily: 'monospace' }}>{latest.org_id}</FluentText></td>;
                              case 'task_name':
                                return <td key={colId} className={styles.td}><CellWithSQL query={ruleQuery} columnName="Task Name">{latest.task_name}</CellWithSQL></td>;
                              case 'rule_name':
                                return <td key={colId} className={styles.td}><CellWithSQL query={ruleQuery} columnName="Rule Name">{latest.rule_name}</CellWithSQL></td>;
                              case 'output_name':
                                return <td key={colId} className={styles.td}><CellWithSQL query={outputQuery} columnName="Output Name">{latest.output_name}</CellWithSQL></td>;
                              case 'source_fields':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200}>
                                      {latest.source_fields && latest.source_fields.length > 0
                                        ? latest.source_fields.join(', ')
                                        : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'dimension':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <CellWithSQL query={ruleQuery} columnName="Dimension">
                                      {latest.dimension ? (
                                        <Badge color="informative">{latest.dimension}</Badge>
                                      ) : (
                                        <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>N/A</FluentText>
                                      )}
                                    </CellWithSQL>
                                  </td>
                                );
                              case 'execution_time':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200} style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                                      {latest.run_date ? new Date(latest.run_date).toLocaleString() : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'score':
                                // Prepare data points for trend chart
                                const dataPoints = metrics.map(m => ({
                                  timestamp: m.run_date || '',
                                  score: m.score,
                                  run_key: m.run_key
                                }));

                                return (
                                  <td key={colId} className={`${styles.td} ${styles.heatCell} ${getValidationColor(latest.score, latest.threshold_high, latest.threshold_low)}`}>
                                    <CellWithSQL query={`Score = (${latest.valid_rows} / ${latest.total_rows}) * 100\n\n${outputQuery}`} columnName="Score">
                                      {latest.score.toFixed(2)}%
                                      {metrics.length > 0 && (
                                        <ScoreTrendChart
                                          dataPoints={dataPoints}
                                          thresholdLow={latest.threshold_low}
                                          thresholdHigh={latest.threshold_high}
                                          ruleName={latest.rule_name}
                                          outputName={latest.output_name}
                                        />
                                      )}
                                    </CellWithSQL>
                                  </td>
                                );
                              case 'total_rows':
                                return <td key={colId} className={styles.td}><CellWithSQL query={outputQuery} columnName="Total Rows">{latest.total_rows.toLocaleString()}</CellWithSQL></td>;
                              case 'valid_rows':
                                return <td key={colId} className={styles.td}><CellWithSQL query={outputQuery} columnName="Valid Rows">{latest.valid_rows.toLocaleString()}</CellWithSQL></td>;
                              case 'invalid_rows':
                                return <td key={colId} className={styles.td}><CellWithSQL query={outputQuery} columnName="Invalid Rows">{latest.invalid_rows.toLocaleString()}</CellWithSQL></td>;
                              case 'threshold_high':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span>{latest.threshold_high !== null ? latest.threshold_high : 'N/A'}</span>
                                      {!latest.has_rule_occurrence && latest.threshold_high !== null && (
                                        <Tooltip
                                          content="Default threshold (90%). This rule is not linked to a Rule Occurrence in IDMC, so it uses fixed default values."
                                          relationship="description"
                                        >
                                          <Info16Regular style={{ color: tokens.colorNeutralForeground3, cursor: 'help' }} />
                                        </Tooltip>
                                      )}
                                    </div>
                                  </td>
                                );
                              case 'threshold_low':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span>{latest.threshold_low !== null ? latest.threshold_low : 'N/A'}</span>
                                      {!latest.has_rule_occurrence && latest.threshold_low !== null && (
                                        <Tooltip
                                          content="Default threshold (70%). This rule is not linked to a Rule Occurrence in IDMC, so it uses fixed default values."
                                          relationship="description"
                                        >
                                          <Info16Regular style={{ color: tokens.colorNeutralForeground3, cursor: 'help' }} />
                                        </Tooltip>
                                      )}
                                    </div>
                                  </td>
                                );
                              case 'trend':
                                return (
                                  <td key={colId} className={`${styles.td} ${styles.sparklineCell}`}>
                                    <CellWithSQL query={trendQuery} columnName="Trend">
                                      {renderValidationSparkline(metrics)}
                                    </CellWithSQL>
                                  </td>
                                );
                              default:
                                return null;
                            }
                          };

                          return (
                            <tr key={key}>
                              {ruleTableOrder.map(colId => renderRuleCell(colId))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {hasMoreRules && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Button appearance="secondary" onClick={() => setRuleLimit(prev => prev + 500)}>
                      Load Next 500 Rules
                    </Button>
                  </div>
                )}
              </div>

              <Divider />

              {/* Dimension Analytics */}
              {Object.keys(dimensionStats).length > 0 && (
                <>
                  <div className={styles.section}>
                    <FluentText size={500} weight="semibold">
                      Average Scores by Dimension
                    </FluentText>
                    <div className={styles.dimensionGrid}>
                      {Object.entries(dimensionStats).map(([dimension, stats]) => {
                        const color = stats.avgScore > 90 ? '#107c10' : stats.avgScore > 70 ? '#f7630c' : '#d13438';
                        const trend = calculateTrend(stats.historicalScores);

                        const dimensionQuery = `-- Get average score by dimension across runs
SELECT
  rm.dimension,
  pr.run_key,
  pr.run_start_time,
  AVG((fom.valid_rows * 100.0 / fom.total_rows)) as avg_score,
  COUNT(DISTINCT rm.rule_mapplet_id) as rule_count
FROM dim_rule_mapplet rm
JOIN fact_rule_output_mapping fom ON rm.rule_mapplet_id = fom.rule_mapplet_id
JOIN dim_profiling_run pr ON fom.profiling_run_id = pr.profiling_run_id
WHERE rm.dimension = '${dimension}'
GROUP BY rm.dimension, pr.run_key, pr.run_start_time
ORDER BY pr.run_key DESC

-- Current query shows:
-- Dimension: ${dimension}
-- Avg Score: ${stats.avgScore.toFixed(2)}%
-- Rule Count: ${stats.count}
-- Historical Scores: ${stats.historicalScores.map(s => s.toFixed(1) + '%').join(' → ')}`;

                        return (
                          <Card key={dimension} className={styles.dimensionCard} title={dimensionQuery}>
                            <FluentText size={400} weight="semibold">{dimension}</FluentText>
                            {renderDonut(stats.avgScore, color)}
                            <FluentText size={200} style={{ marginTop: '8px' }}>
                              {stats.count} rule{stats.count !== 1 ? 's' : ''}
                            </FluentText>
                            {stats.historicalScores.length > 0 && (
                              <div style={{ marginTop: '12px' }} title={dimensionQuery}>
                                <FluentText size={300} weight="semibold" style={{ color: trend.color, fontSize: '20px' }}>
                                  {trend.arrow}
                                </FluentText>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                  <Divider />
                </>
              )}

              {/* Column Quality Heat Map */}
              <div className={styles.section}>
                <FluentText size={500} weight="semibold">
                  Column Quality Metrics ({columnMetrics.length} unique columns)
                </FluentText>
                <FluentText size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                  Heat map showing uniqueness, completeness, pattern cardinality, and data type cardinality.
                  {columnMetrics.length > 0 && ` Showing top ${columnMetrics.length} columns sorted by latest execution.`}
                </FluentText>

                {columnMetrics.length === 0 ? (
                  <Card>
                    <FluentText>No column metrics found. Adjust filters or sync profiling data.</FluentText>
                  </Card>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          {columnTableOrder.map(colId => {
                            const columnInfo = {
                              org_id: { label: 'Org ID', field: 'org_id', tooltip: 'SELECT org_id FROM dim_profiling_task' },
                              task_name: { label: 'Task', field: 'task_name', tooltip: 'SELECT profiling_name FROM dim_profiling_task' },
                              column_name: { label: 'Column', field: 'column_name', tooltip: 'SELECT field_name FROM dim_data_source_field' },
                              execution_time: { label: 'Execution Time', field: 'latest_run_key', tooltip: 'SELECT run_start_time FROM dim_profiling_run' },
                              total_rows: { label: 'Total Rows', field: 'latest_total_rows', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'TOTAL_ROWS'" },
                              drift_total_rows: { label: 'Drift %', field: 'drift_total_rows', tooltip: 'Drift % between latest and previous run for Total Rows' },
                              distinct_count: { label: 'Distinct Count', field: 'latest_distinct_count', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'DISTINCT_COUNT'" },
                              drift_distinct_count: { label: 'Drift %', field: 'drift_distinct_count', tooltip: 'Drift % between latest and previous run for Distinct Count' },
                              null_count: { label: 'NULL Count', field: 'latest_null_count', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'NULL_COUNT'" },
                              drift_null_count: { label: 'Drift %', field: 'drift_null_count', tooltip: 'Drift % between latest and previous run for NULL Count' },
                              zero_count: { label: 'Zero Count', field: 'latest_zero_count', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'ZERO_COUNT'" },
                              drift_zero_count: { label: 'Drift %', field: 'drift_zero_count', tooltip: 'Drift % between latest and previous run for Zero Count' },
                              blank_count: { label: 'Blank Count', field: 'latest_blank_count', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'BLANK_COUNT'" },
                              drift_blank_count: { label: 'Drift %', field: 'drift_blank_count', tooltip: 'Drift % between latest and previous run for Blank Count' },
                              duplicate_count: { label: 'Duplicate Count', field: 'latest_duplicate_count', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'DUPLICATE_COUNT'" },
                              drift_duplicate_count: { label: 'Drift %', field: 'drift_duplicate_count', tooltip: 'Drift % between latest and previous run for Duplicate Count' },
                              average: { label: 'Average', field: 'latest_average', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'AVERAGE'" },
                              drift_average: { label: 'Drift %', field: 'drift_average', tooltip: 'Drift % between latest and previous run for Average' },
                              standard_deviation: { label: 'Std Deviation', field: 'latest_standard_deviation', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'STANDARD_DEVIATION'" },
                              drift_standard_deviation: { label: 'Drift %', field: 'drift_standard_deviation', tooltip: 'Drift % between latest and previous run for Standard Deviation' },
                              uniqueness: { label: 'Uniqueness (%)', field: 'latest_distinct_percent', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'DISTINCT_PERCENT'" },
                              completeness: { label: 'Completeness (NULL %)', field: 'latest_null_percent', tooltip: "SELECT metric_value FROM fact_profiling_result WHERE metric_type = 'NULL_PERCENT'" },
                              patterns: { label: 'Patterns', field: 'latest_pattern_count', tooltip: 'SELECT COUNT(DISTINCT pattern_label) FROM fact_column_pattern GROUP BY profiling_run_id, column_name' },
                              datatypes: { label: 'Data Types', field: 'latest_datatype_count', tooltip: 'SELECT COUNT(DISTINCT inferred_datatype) FROM fact_column_datatype GROUP BY profiling_run_id, column_name' },
                              trend_uniqueness: { label: 'Trend (Uniqueness)', field: 'trend_uniqueness', tooltip: 'Trend calculated by comparing DISTINCT_PERCENT across runs ordered by run_key' },
                              trend_completeness: { label: 'Trend (Completeness)', field: 'trend_completeness', tooltip: 'Trend calculated by comparing NULL_PERCENT across runs ordered by run_key' }
                            }[colId];

                            if (!columnInfo) return null;

                            const isSorted = columnSortField === columnInfo.field;
                            const sortIcon = isSorted ? (columnSortDirection === 'asc' ? ' ▲' : ' ▼') : '';

                            return (
                              <th
                                key={colId}
                                className={styles.th}
                                draggable
                                onDragStart={() => handleColumnDragStart(colId)}
                                onDragOver={(e) => handleColumnDragOver(e, colId)}
                                onDragEnd={handleColumnDragEnd}
                                style={{ userSelect: 'none' }}
                              >
                                <div className={styles.thContainer}>
                                  <span
                                    onClick={() => handleColumnSort(columnInfo.field)}
                                    style={{ cursor: 'pointer' }}
                                    title="Click to sort • Drag header to reorder"
                                  >
                                    {columnInfo.label}{sortIcon}
                                  </span>
                                  <div className={`sql-popover ${styles.sqlPopoverWrapper}`}>
                                    <SQLQueryPopover
                                      query={columnInfo.tooltip}
                                      title="Star Schema SQL Query"
                                      columnName={columnInfo.label}
                                    />
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {columnMetrics.map((metric, idx) => {
                          const columnQuery = `-- Get column metadata
SELECT
  dsf.field_name,
  dsf.field_type,
  pt.profiling_name as task_name,
  pt.org_id
FROM dim_data_source_field dsf
JOIN dim_profiling_task pt ON dsf.profiling_task_id = pt.profiling_task_id
WHERE dsf.field_name = '${metric.column_name}'
  AND pt.profiling_name = '${metric.task_name}'`;

                          const distinctQuery = `-- Get uniqueness metric
SELECT
  pr.run_key,
  pr.run_start_time,
  fpr.metric_value as distinct_percent
FROM fact_profiling_result fpr
JOIN dim_profiling_run pr ON fpr.profiling_run_id = pr.profiling_run_id
WHERE fpr.column_name = '${metric.column_name}'
  AND fpr.metric_type = 'DISTINCT_PERCENT'
  AND pr.profiling_task_id = '${metric.task_id}'
ORDER BY pr.run_key DESC`;

                          const nullQuery = `-- Get completeness metric
SELECT
  pr.run_key,
  pr.run_start_time,
  fpr.metric_value as null_percent
FROM fact_profiling_result fpr
JOIN dim_profiling_run pr ON fpr.profiling_run_id = pr.profiling_run_id
WHERE fpr.column_name = '${metric.column_name}'
  AND fpr.metric_type = 'NULL_PERCENT'
  AND pr.profiling_task_id = '${metric.task_id}'
ORDER BY pr.run_key DESC`;

                          const patternQuery = `-- Get pattern cardinality
SELECT
  pr.run_key,
  fcp.pattern_label,
  fcp.pattern_frequency
FROM fact_column_pattern fcp
JOIN dim_profiling_run pr ON fcp.profiling_run_id = pr.profiling_run_id
WHERE fcp.column_name = '${metric.column_name}'
  AND pr.profiling_task_id = '${metric.task_id}'
ORDER BY pr.run_key DESC, fcp.pattern_frequency DESC`;

                          const datatypeQuery = `-- Get datatype cardinality
SELECT
  pr.run_key,
  fcdt.inferred_datatype,
  fcdt.row_count
FROM fact_column_datatype fcdt
JOIN dim_profiling_run pr ON fcdt.profiling_run_id = pr.profiling_run_id
WHERE fcdt.column_name = '${metric.column_name}'
  AND pr.profiling_task_id = '${metric.task_id}'
ORDER BY pr.run_key DESC, fcdt.row_count DESC`;

                          const renderCell = (colId: string) => {
                            switch (colId) {
                              case 'org_id':
                                return <td key={colId} className={styles.td}><FluentText size={200} style={{ fontFamily: 'monospace' }}>{metric.org_id}</FluentText></td>;
                              case 'task_name':
                                return <td key={colId} className={styles.td}><CellWithSQL query={columnQuery} columnName="Task Name">{metric.task_name}</CellWithSQL></td>;
                              case 'column_name':
                                return <td key={colId} className={styles.td}><CellWithSQL query={columnQuery} columnName="Column Name">{metric.column_name}</CellWithSQL></td>;
                              case 'execution_time':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200} style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                                      {metric.runs && metric.runs.length > 0 && metric.runs[0].run_date ?
                                        new Date(metric.runs[0].run_date).toLocaleString() : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'uniqueness':
                                return (
                                  <td key={colId} className={`${styles.td} ${styles.heatCell} ${getUniquenessColor(metric.latest_distinct_percent)}`}>
                                    <CellWithSQL query={distinctQuery} columnName="Uniqueness">
                                      {metric.latest_distinct_percent !== null && metric.latest_distinct_percent !== undefined ? metric.latest_distinct_percent.toFixed(2) : 'N/A'}
                                    </CellWithSQL>
                                  </td>
                                );
                              case 'completeness':
                                return (
                                  <td key={colId} className={`${styles.td} ${styles.heatCell} ${getCompletenessColor(metric.latest_null_percent)}`}>
                                    <CellWithSQL query={nullQuery} columnName="Completeness">
                                      {metric.latest_null_percent !== null && metric.latest_null_percent !== undefined ? metric.latest_null_percent.toFixed(2) : 'N/A'}
                                    </CellWithSQL>
                                  </td>
                                );
                              case 'patterns':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <CellWithSQL query={patternQuery} columnName="Patterns">
                                      <Badge appearance={metric.latest_pattern_count < 5 ? 'filled' : 'outline'} color={metric.latest_pattern_count < 5 ? 'success' : 'warning'}>
                                        {metric.latest_pattern_count < 5 ? 'Low' : 'High'} ({metric.latest_pattern_count})
                                      </Badge>
                                    </CellWithSQL>
                                  </td>
                                );
                              case 'datatypes':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <CellWithSQL query={datatypeQuery} columnName="Data Types">
                                      <Badge appearance={metric.latest_datatype_count < 5 ? 'filled' : 'outline'} color={metric.latest_datatype_count < 5 ? 'success' : 'warning'}>
                                        {metric.latest_datatype_count < 5 ? 'Low' : 'High'} ({metric.latest_datatype_count})
                                      </Badge>
                                    </CellWithSQL>
                                  </td>
                                );
                              case 'trend_uniqueness':
                                return (
                                  <td key={colId} className={`${styles.td} ${styles.sparklineCell}`}>
                                    <CellWithSQL query={distinctQuery} columnName="Uniqueness Trend">
                                      {renderSparkline(metric.runs, 'distinct_percent')}
                                    </CellWithSQL>
                                  </td>
                                );
                              case 'trend_completeness':
                                return (
                                  <td key={colId} className={`${styles.td} ${styles.sparklineCell}`}>
                                    <CellWithSQL query={nullQuery} columnName="Completeness Trend">
                                      {renderSparkline(metric.runs, 'null_percent')}
                                    </CellWithSQL>
                                  </td>
                                );
                              case 'total_rows':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200}>
                                      {metric.latest_total_rows !== null && metric.latest_total_rows !== undefined ? metric.latest_total_rows.toLocaleString() : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'drift_total_rows':
                                return (
                                  <td key={colId} className={`${styles.td} ${getDriftColor(metric.drift_total_rows)}`}>
                                    <FluentText size={200}>
                                      {metric.drift_total_rows !== null && metric.drift_total_rows !== undefined ? `${metric.drift_total_rows > 0 ? '+' : ''}${metric.drift_total_rows.toFixed(2)}%` : '-'}
                                    </FluentText>
                                  </td>
                                );
                              case 'distinct_count':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200}>
                                      {metric.latest_distinct_count !== null && metric.latest_distinct_count !== undefined ? metric.latest_distinct_count.toLocaleString() : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'drift_distinct_count':
                                return (
                                  <td key={colId} className={`${styles.td} ${getDriftColor(metric.drift_distinct_count)}`}>
                                    <FluentText size={200}>
                                      {metric.drift_distinct_count !== null && metric.drift_distinct_count !== undefined ? `${metric.drift_distinct_count > 0 ? '+' : ''}${metric.drift_distinct_count.toFixed(2)}%` : '-'}
                                    </FluentText>
                                  </td>
                                );
                              case 'null_count':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200}>
                                      {metric.latest_null_count !== null && metric.latest_null_count !== undefined ? metric.latest_null_count.toLocaleString() : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'drift_null_count':
                                return (
                                  <td key={colId} className={`${styles.td} ${getDriftColor(metric.drift_null_count)}`}>
                                    <FluentText size={200}>
                                      {metric.drift_null_count !== null && metric.drift_null_count !== undefined ? `${metric.drift_null_count > 0 ? '+' : ''}${metric.drift_null_count.toFixed(2)}%` : '-'}
                                    </FluentText>
                                  </td>
                                );
                              case 'zero_count':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200}>
                                      {metric.latest_zero_count !== null && metric.latest_zero_count !== undefined ? metric.latest_zero_count.toLocaleString() : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'drift_zero_count':
                                return (
                                  <td key={colId} className={`${styles.td} ${getDriftColor(metric.drift_zero_count)}`}>
                                    <FluentText size={200}>
                                      {metric.drift_zero_count !== null && metric.drift_zero_count !== undefined ? `${metric.drift_zero_count > 0 ? '+' : ''}${metric.drift_zero_count.toFixed(2)}%` : '-'}
                                    </FluentText>
                                  </td>
                                );
                              case 'blank_count':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200}>
                                      {metric.latest_blank_count !== null && metric.latest_blank_count !== undefined ? metric.latest_blank_count.toLocaleString() : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'drift_blank_count':
                                return (
                                  <td key={colId} className={`${styles.td} ${getDriftColor(metric.drift_blank_count)}`}>
                                    <FluentText size={200}>
                                      {metric.drift_blank_count !== null && metric.drift_blank_count !== undefined ? `${metric.drift_blank_count > 0 ? '+' : ''}${metric.drift_blank_count.toFixed(2)}%` : '-'}
                                    </FluentText>
                                  </td>
                                );
                              case 'duplicate_count':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200}>
                                      {metric.latest_duplicate_count !== null && metric.latest_duplicate_count !== undefined ? metric.latest_duplicate_count.toLocaleString() : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'drift_duplicate_count':
                                return (
                                  <td key={colId} className={`${styles.td} ${getDriftColor(metric.drift_duplicate_count)}`}>
                                    <FluentText size={200}>
                                      {metric.drift_duplicate_count !== null && metric.drift_duplicate_count !== undefined ? `${metric.drift_duplicate_count > 0 ? '+' : ''}${metric.drift_duplicate_count.toFixed(2)}%` : '-'}
                                    </FluentText>
                                  </td>
                                );
                              case 'average':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200}>
                                      {metric.latest_average !== null && metric.latest_average !== undefined ? metric.latest_average.toFixed(2) : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'drift_average':
                                return (
                                  <td key={colId} className={`${styles.td} ${getDriftColor(metric.drift_average)}`}>
                                    <FluentText size={200}>
                                      {metric.drift_average !== null && metric.drift_average !== undefined ? `${metric.drift_average > 0 ? '+' : ''}${metric.drift_average.toFixed(2)}%` : '-'}
                                    </FluentText>
                                  </td>
                                );
                              case 'standard_deviation':
                                return (
                                  <td key={colId} className={styles.td}>
                                    <FluentText size={200}>
                                      {metric.latest_standard_deviation !== null && metric.latest_standard_deviation !== undefined ? metric.latest_standard_deviation.toFixed(2) : 'N/A'}
                                    </FluentText>
                                  </td>
                                );
                              case 'drift_standard_deviation':
                                return (
                                  <td key={colId} className={`${styles.td} ${getDriftColor(metric.drift_standard_deviation)}`}>
                                    <FluentText size={200}>
                                      {metric.drift_standard_deviation !== null && metric.drift_standard_deviation !== undefined ? `${metric.drift_standard_deviation > 0 ? '+' : ''}${metric.drift_standard_deviation.toFixed(2)}%` : '-'}
                                    </FluentText>
                                  </td>
                                );
                              default:
                                return null;
                            }
                          };

                          return (
                            <tr key={idx}>
                              {columnTableOrder.map(colId => renderCell(colId))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {hasMoreColumns && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Button appearance="secondary" onClick={() => setColumnLimit(prev => prev + 500)}>
                      Load Next 500 Columns
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </FluentProvider>
    </Layout>
  );
};

export default Reports;
