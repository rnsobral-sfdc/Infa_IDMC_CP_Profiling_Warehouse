import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHeaderCell,
  TableCellLayout,
  Spinner,
  Text as FluentText,
  Title3,
  Title2,
  Body1,
  makeStyles,
  tokens,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbButton,
  Divider,
  Tab,
  TabList,
  Badge,
} from '@fluentui/react-components';
import {
  ArrowLeft24Regular,
  ArrowSync24Regular,
  ChevronRight16Regular,
  Table24Regular,
  CheckmarkCircle24Regular,
} from '@fluentui/react-icons';
import Layout from '../src/components/Layout';
import { api } from '../src/lib/api';
import { useRouter } from 'next/router';
import { APIInfoPopover } from '../src/components/APIInfoPopover';
import { PageHeader } from '../src/components/PageHeader';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalXL,
  },
  card: {
    marginBottom: tokens.spacingVerticalL,
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    minWidth: '100%',
    tableLayout: 'auto',
  },
  breadcrumb: {
    marginBottom: tokens.spacingVerticalL,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalL,
  },
  statCard: {
    padding: tokens.spacingVerticalM,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
  },
  metricValue: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase300,
  },
  tabsContainer: {
    marginBottom: tokens.spacingVerticalL,
  },
});

interface ProfilingResult {
  result_id: number;
  profiling_run_id: string;
  profiling_task_id: string;
  dq_asset_id: number;
  column_name: string;
  metric_type: string;
  metric_value: number | null;
  metric_value_text: string | null;
  run_timestamp: string;
  column_type?: string;
  column_id_external?: string;
  documented_data_type?: string;
  inferred_data_type?: string;
  inferred_patterns?: string;
}

interface ProfilingRun {
  profiling_run_id: string;
  run_key: string;
  run_status: string;
  run_start_time: string;
  run_end_time?: string;
  run_duration_seconds?: number;
  row_count?: number;
}

interface RuleOccurrence {
  occurrence_id: string;
  name: string;
  description?: string;
  rule_frs_id: string;
  mapplet_column_id: string;
  threshold: number | null;
  target: number | null;
  criticality: string | null;
  type: string | null;
  frequency: string | null;
  measuring_method: string | null;
  output_column_name: string | null;
  output_column_key: number | null;
}

interface ColumnPattern {
  pattern_id: number;
  column_id_external: string;
  column_name: string;
  domain_value: string;
  pattern_label: string;
  inferred_datatype: string;
  satisfied_count: number;
  satisfied_count_percent: number;
  total_rows: number;
}

interface ColumnDataType {
  datatype_id: number;
  column_id_external: string;
  column_name: string;
  datatype_category: string;
  inferred_datatype: string;
  frequency: number;
  frequency_percent: number;
  total_rows: number;
}

interface ValueFrequency {
  value_frequency_id: number;
  column_id_external: string;
  column_name: string;
  column_value: string;
  frequency: number;
  percent: number;
  is_outlier: number;
  value_rank: number;
}

export default function ProfilingRunDetailsPage() {
  const styles = useStyles();
  const router = useRouter();
  const { runId, taskName, runKey, profileId } = router.query;

  const [results, setResults] = useState<ProfilingResult[]>([]);
  const [run, setRun] = useState<ProfilingRun | null>(null);
  const [patterns, setPatterns] = useState<ColumnPattern[]>([]);
  const [dataTypes, setDataTypes] = useState<ColumnDataType[]>([]);
  const [valueFrequencies, setValueFrequencies] = useState<ValueFrequency[]>([]);
  const [ruleOccurrences, setRuleOccurrences] = useState<RuleOccurrence[]>([]);
  const [ruleStatistics, setRuleStatistics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('column');

  useEffect(() => {
    if (runId) {
      loadData();
    }
  }, [runId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [resultsData, runData, patternsData, dataTypesData, frequenciesData] = await Promise.all([
        api.getProfilingResults({ run_id: runId, limit: 1000 }) as Promise<ProfilingResult[]>,
        fetch(`http://localhost:8000/profiling/runs/${runId}`).then(r => r.json()) as Promise<ProfilingRun>,
        api.getColumnPatterns(runId as string).catch(() => [] as ColumnPattern[]),
        api.getColumnDataTypes(runId as string).catch(() => [] as ColumnDataType[]),
        api.getColumnValueFrequencies(runId as string).catch(() => [] as ValueFrequency[])
      ]);
      setResults(resultsData || []);
      setRun(runData);
      setPatterns(Array.isArray(patternsData) ? patternsData : []);
      setDataTypes(Array.isArray(dataTypesData) ? dataTypesData : []);
      setValueFrequencies(Array.isArray(frequenciesData) ? frequenciesData : []);

      // Fetch rule occurrences for this profile
      try {
        const ruleOccurrencesData = await fetch(`http://localhost:8000/profiling/rule-occurrences/${profileId}`).then(r => r.json());
        setRuleOccurrences(Array.isArray(ruleOccurrencesData) ? ruleOccurrencesData : []);
      } catch (err) {
        console.warn('Failed to load rule occurrences:', err);
        setRuleOccurrences([]);
      }

      // Fetch rule statistics with input/output mappings
      try {
        const ruleStatsData = await fetch(`http://localhost:8000/profiling/runs/${runId}/rule-statistics`).then(r => r.json());
        setRuleStatistics(Array.isArray(ruleStatsData) ? ruleStatsData : []);
      } catch (err) {
        console.warn('Failed to load rule statistics:', err);
        setRuleStatistics([]);
      }

      // Debug logging
      console.log(`Run ID: ${runId}`);
      console.log(`Patterns loaded: ${Array.isArray(patternsData) ? patternsData.length : 0}`);
      console.log(`DataTypes loaded: ${Array.isArray(dataTypesData) ? dataTypesData.length : 0}`);
      console.log(`ValueFrequencies loaded: ${Array.isArray(frequenciesData) ? frequenciesData.length : 0}`);
      console.log(`Rule Occurrences loaded: ${ruleOccurrences.length}`);
      console.log(`Rule Statistics loaded: ${ruleStatistics.length}`);

      // Debug: Show unique column names from each source
      if (Array.isArray(patternsData) && patternsData.length > 0) {
        const patternColumns = [...new Set(patternsData.map(p => p.column_name))];
        console.log('Pattern columns:', patternColumns);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profiling details');
      console.error('Error loading details:', err);
    } finally {
      setLoading(false);
    }
  }

  // Group results by column
  const columnStatistics = results.reduce((acc, result) => {
    const columnName = result.column_name || 'Table Level';
    if (!acc[columnName]) {
      acc[columnName] = [];
    }
    acc[columnName].push(result);
    return acc;
  }, {} as Record<string, ProfilingResult[]>);

  // Get all unique column names from all sources (statistics, patterns, datatypes, frequencies)
  const allColumnNames = new Set<string>();

  // Add columns from statistics
  Object.keys(columnStatistics).forEach(col => {
    if (col !== 'Table Level') allColumnNames.add(col);
  });

  // Add columns from patterns
  if (Array.isArray(patterns)) {
    patterns.forEach(p => {
      if (p.column_name) allColumnNames.add(p.column_name);
    });
  }

  // Add columns from datatypes
  if (Array.isArray(dataTypes)) {
    dataTypes.forEach(dt => {
      if (dt.column_name) allColumnNames.add(dt.column_name);
    });
  }

  // Add columns from value frequencies
  if (Array.isArray(valueFrequencies)) {
    valueFrequencies.forEach(vf => {
      if (vf.column_name) allColumnNames.add(vf.column_name);
    });
  }

  // Separate table-level and column-level statistics
  const tableLevelStats = columnStatistics['Table Level'] || [];

  // Filter to only show DATASOURCEFIELD columns in Column Statistics tab
  const columnLevelStats = Array.from(allColumnNames)
    .filter(columnName => {
      // Get stats for this column to check column_type
      const stats = columnStatistics[columnName] || [];
      if (stats.length === 0) return true; // Include if no stats (from patterns/datatypes only)
      // Only include if column_type is DATASOURCEFIELD or not set
      return stats[0]?.column_type === 'DATASOURCEFIELD' || !stats[0]?.column_type;
    })
    .map(columnName => [columnName, columnStatistics[columnName] || []] as [string, ProfilingResult[]]);

  // Rule statistics (columns where columnType is not DATASOURCEFIELD)
  const ruleStats = results.filter(r =>
    r.column_type && r.column_type !== 'DATASOURCEFIELD'
  );

  // Group rule stats by column for better display
  const ruleStatsByColumn = ruleStats.reduce((acc, result) => {
    const columnName = result.column_name || 'Unknown';
    if (!acc[columnName]) {
      acc[columnName] = [];
    }
    acc[columnName].push(result);
    return acc;
  }, {} as Record<string, ProfilingResult[]>);

  const formatMetricValue = (value: number | null, textValue: string | null) => {
    if (textValue) return textValue;
    if (value === null || value === undefined) return '-';

    // Format large numbers with commas
    if (value > 999) {
      return value.toLocaleString();
    }

    // Format decimals
    if (value % 1 !== 0) {
      return value.toFixed(4);
    }

    return value.toString();
  };

  const formatMetricType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbButton onClick={() => router.push('/profiling-tasks')}>
                Profiling Tasks
              </BreadcrumbButton>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <ChevronRight16Regular />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbButton onClick={() => router.back()}>
                {taskName}
              </BreadcrumbButton>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <ChevronRight16Regular />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbButton current>Run {runKey}</BreadcrumbButton>
            </BreadcrumbItem>
          </Breadcrumb>
        </div>

        <PageHeader
          title="Profiling Run Details"
          subtitle={`Run Key: ${runKey}`}
          actions={
            <>
              <APIInfoPopover
                title="Run Details API - Column Statistics"
                endpoint={`/profiling-service/api/v1/profile/${profileId}/run/${runKey}`}
                baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                method="GET"
                description="Get detailed column statistics for a specific profiling run. Returns all profiled columns with their data types, null counts, distinct counts, and inferred patterns. This is the primary API for viewing profiling results."
                parameters={{
                  profileId: profileId as string,
                  runKey: runKey as string
                }}
                keyFields={[
                  {
                    label: 'Profile ID',
                    value: `${profileId}`,
                    usedIn: 'Used in URL: /profile/{profileId}/run/{runKey}'
                  },
                  {
                    label: 'Run Key',
                    value: `${runKey}`,
                    usedIn: 'Used in URL: /profile/{profileId}/run/{runKey}'
                  },
                  {
                    label: 'Column ID',
                    value: 'column.id (from response)',
                    usedIn: 'GET /metric-store/api/v1/odata/Profiles(\'{profileId}\')/Columns(\'{columnId}\') - Get detailed statistics'
                  },
                  {
                    label: 'Session ID',
                    value: '<from login response>',
                    usedIn: 'Header: IDS-SESSION-ID required for all profiling service APIs'
                  },
                  {
                    label: 'Data Source',
                    value: 'IDMC Profiling Service → Star Schema (FactProfilingResult)',
                    usedIn: 'This data is extracted from IDMC and stored in our star schema for analysis'
                  }
                ]}
                responseExample={{
                  columns: [{
                    id: "col123",
                    name: "CUSTOMER_NAME",
                    dataType: "String",
                    documentedDataType: "VARCHAR(100)",
                    patterns: ["Alpha", "Mixed Case"],
                    distinctCount: 1500,
                    nullCount: 0,
                    inferredLength: 50,
                    minLength: 5,
                    maxLength: 100
                  }],
                  runKey: runKey,
                  profileId: profileId
                }}
                highlightedFields={['id', 'name', 'dataType', 'documentedDataType', 'distinctCount']}
              />
              <Button
                icon={<ArrowLeft24Regular />}
                onClick={() => router.back()}
              >
                Back
              </Button>
              <Button
                appearance="primary"
                icon={<ArrowSync24Regular />}
                onClick={loadData}
                disabled={loading}
              >
                Refresh
              </Button>
            </>
          }
        />

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXXXL }}>
            <Spinner label="Loading profiling details..." size="large" />
          </div>
        )}

        {error && (
          <Card className={styles.card}>
            <div style={{ padding: tokens.spacingVerticalL, textAlign: 'center' }}>
              <FluentText style={{ color: tokens.colorPaletteRedForeground1, marginBottom: tokens.spacingVerticalM, display: 'block' }}>
                {error}
              </FluentText>
              <Button onClick={loadData}>Retry</Button>
            </div>
          </Card>
        )}

        {!loading && !error && run && (
          <>
            {/* Run Summary */}
            <Card className={styles.card}>
              <div style={{ padding: tokens.spacingVerticalL }}>
                <Title2 style={{ marginBottom: tokens.spacingVerticalM }}>Run Summary</Title2>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>Status</FluentText>
                    <FluentText size={300} weight="semibold">{run.run_status}</FluentText>
                  </div>
                  <div className={styles.statCard}>
                    <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>Start Time</FluentText>
                    <FluentText size={300}>{run.run_start_time ? new Date(run.run_start_time).toLocaleString() : '-'}</FluentText>
                  </div>
                  <div className={styles.statCard}>
                    <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>Duration</FluentText>
                    <FluentText size={300}>{run.run_duration_seconds ? `${run.run_duration_seconds}s` : '-'}</FluentText>
                  </div>
                  <div className={styles.statCard}>
                    <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>Row Count</FluentText>
                    <FluentText size={300} weight="semibold">{run.row_count?.toLocaleString() || '-'}</FluentText>
                  </div>
                  <div className={styles.statCard}>
                    <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>Total Metrics</FluentText>
                    <FluentText size={300} weight="semibold">{results.length}</FluentText>
                  </div>
                  <div className={styles.statCard}>
                    <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>Columns Profiled</FluentText>
                    <FluentText size={300} weight="semibold">{columnLevelStats.length}</FluentText>
                  </div>
                  <div className={styles.statCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, marginBottom: tokens.spacingVerticalXXS }}>
                      <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>Rules/Mapplets Profiled</FluentText>
                      {run?.profiling_task_id && (
                        <APIInfoPopover
                          title="Rule Occurrences API"
                          endpoint={`/profiling-service/api/v1/ruleOccurrence/getAllRuleOccurrencesForProfile_V2_Token/${run.profiling_task_id}`}
                          baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                          parameters={{
                            profileId: run.profiling_task_id,
                          }}
                          dataSource="API: getAllRuleOccurrencesForProfile_V2_Token - Returns rule occurrences with thresholds, targets, criticality, and mapplet column IDs"
                        />
                      )}
                    </div>
                    <FluentText size={300} weight="semibold">{ruleStatistics.length}</FluentText>
                  </div>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <div className={styles.tabsContainer}>
              <TabList
                selectedValue={selectedTab}
                onTabSelect={(e, data) => setSelectedTab(data.value as string)}
              >
                <Tab value="column" icon={<Table24Regular />}>
                  Column Statistics ({columnLevelStats.length})
                </Tab>
                <Tab value="rule" icon={<CheckmarkCircle24Regular />}>
                  Rule Statistics ({ruleStatistics.length})
                </Tab>
              </TabList>
            </div>

            {/* Column Statistics Tab */}
            {selectedTab === 'column' && (
              <>
                {/* Table Level Statistics */}
                {tableLevelStats.length > 0 && (
                  <Card className={styles.card}>
                    <div style={{ padding: tokens.spacingVerticalL }}>
                      <div className={styles.sectionHeader}>
                        <Table24Regular />
                        <Title3>Table Level Statistics</Title3>
                      </div>
                      <div className={styles.tableContainer}>
                        <Table size="small">
                          <TableHeader>
                            <TableRow>
                              <TableHeaderCell>Metric</TableHeaderCell>
                              <TableHeaderCell>Value</TableHeaderCell>
                              <TableHeaderCell>Timestamp</TableHeaderCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableLevelStats.map((stat, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  <TableCellLayout>
                                    <FluentText weight="semibold">{formatMetricType(stat.metric_type)}</FluentText>
                                  </TableCellLayout>
                                </TableCell>
                                <TableCell>
                                  <TableCellLayout>
                                    <span className={styles.metricValue}>
                                      {formatMetricValue(stat.metric_value, stat.metric_value_text)}
                                    </span>
                                  </TableCellLayout>
                                </TableCell>
                                <TableCell>
                                  <TableCellLayout>
                                    <FluentText size={200}>
                                      {stat.run_timestamp ? new Date(stat.run_timestamp).toLocaleString() : '-'}
                                    </FluentText>
                                  </TableCellLayout>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Column Level Statistics - New Clean Design */}
                {columnLevelStats.map(([columnName, stats]) => {
                  // Get first stat to extract metadata
                  const firstStat = stats[0];
                  const documentedType = firstStat?.documented_data_type;
                  const inferredType = firstStat?.inferred_data_type;
                  const columnIdExternal = firstStat?.column_id_external;

                  // Get enhanced data for this column
                  const columnPatterns = Array.isArray(patterns) ? patterns.filter(p => p.column_name === columnName) : [];
                  const columnDataTypes = Array.isArray(dataTypes) ? dataTypes.filter(dt => dt.column_name === columnName) : [];
                  const columnFrequencies = Array.isArray(valueFrequencies) ? valueFrequencies.filter(vf => vf.column_name === columnName) : [];

                  // Group metrics into categories
                  const basicMetrics: { [key: string]: any } = {};
                  const advancedMetrics: { [key: string]: any } = {};

                  stats.forEach(stat => {
                    const metric = stat.metric_type;
                    const value = stat.metric_value;

                    // Basic metrics to show prominently
                    if (['TOTAL_ROWS', 'NULL_COUNT', 'NULL_PERCENT', 'DISTINCT_COUNT', 'DISTINCT_PERCENT'].includes(metric)) {
                      basicMetrics[metric] = value;
                    } else {
                      advancedMetrics[metric] = value;
                    }
                  });

                  return (
                    <Card key={columnName} className={styles.card}>
                      <div style={{ padding: tokens.spacingVerticalL }}>
                        {/* Column Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacingVerticalL }}>
                          <div className={styles.sectionHeader}>
                            <Table24Regular />
                            <div>
                              <Title3 style={{ marginBottom: tokens.spacingVerticalXXS }}>
                                {columnName}
                              </Title3>
                              <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalXXS, flexWrap: 'wrap' }}>
                                {documentedType && (
                                  <Badge appearance="outline" color="brand">
                                    Documented: {documentedType}
                                  </Badge>
                                )}
                                {inferredType && (
                                  <Badge appearance="outline" color="informative">
                                    Inferred: {inferredType}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <APIInfoPopover
                            title="Column Statistics API"
                            endpoint={`/metric-store/api/v1/odata/Profiles('{profileId}')/Columns`}
                            method="GET"
                            description="Fetches column-level profiling statistics including null counts, distinct values, and data quality metrics"
                            baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                            parameters={{
                              profileId: profileId as string || 'profile-uuid'
                            }}
                            responseExample={{
                              value: [{
                                columnKey: 123,
                                columnName: columnName,
                                columnType: "DATASOURCEFIELD",
                                totalRows: 1671,
                                nulCount: 0,
                                distinctCount: 1670
                              }]
                            }}
                            highlightedFields={['columnName', 'columnType', 'totalRows', 'distinctCount']}
                          />
                        </div>

                        <Divider style={{ marginBottom: tokens.spacingVerticalL }} />

                        {/* Basic Statistics */}
                        <div style={{ marginBottom: tokens.spacingVerticalL }}>
                          <FluentText size={400} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalM }}>
                            Key Metrics
                          </FluentText>
                          <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                            {Object.entries(basicMetrics).map(([metricKey, metricValue]) => {
                              const displayValue = typeof metricValue === 'number'
                                ? (metricKey.includes('PERCENT')
                                  ? `${metricValue.toFixed(2)}%`
                                  : metricValue.toLocaleString())
                                : metricValue;

                              return (
                                <div
                                  key={metricKey}
                                  style={{
                                    padding: tokens.spacingVerticalM,
                                    backgroundColor: tokens.colorNeutralBackground1,
                                    borderRadius: tokens.borderRadiusSmall,
                                    border: `1px solid ${tokens.colorNeutralStroke2}`
                                  }}
                                >
                                  <FluentText
                                    size={200}
                                    style={{
                                      color: tokens.colorNeutralForeground3,
                                      display: 'block',
                                      marginBottom: tokens.spacingVerticalXXS
                                    }}
                                  >
                                    {metricKey.replace(/_/g, ' ')}
                                  </FluentText>
                                  <FluentText
                                    size={500}
                                    weight="semibold"
                                    style={{ display: 'block', fontFamily: 'monospace' }}
                                  >
                                    {displayValue}
                                  </FluentText>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Inferred Patterns */}
                        {columnPatterns.length > 0 && (
                          <>
                            <Divider style={{ marginBottom: tokens.spacingVerticalL }} />
                            <div style={{ marginBottom: tokens.spacingVerticalL }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                                <FluentText size={400} weight="semibold">
                                  Inferred Patterns
                                </FluentText>
                                <APIInfoPopover
                                  title="Column Patterns API"
                                  endpoint={`/metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/Patterns?runKey={runKey}`}
                                  method="GET"
                                  description="Fetches inferred data patterns with pattern labels and satisfaction percentages"
                                  baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                                  parameters={{
                                    profileId: profileId as string || 'profile-uuid',
                                    columnId: columnIdExternal || 'column-uuid',
                                    runKey: run?.run_key || '1'
                                  }}
                                  responseExample={[{
                                    patternLabel: "X(4)",
                                    satisfiedCount: 1000,
                                    satisfiedCountPercent: 95.5
                                  }]}
                                  highlightedFields={['patternLabel', 'satisfiedCount', 'satisfiedCountPercent']}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
                                {columnPatterns.slice(0, 5).map((pattern, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: tokens.spacingVerticalM,
                                      backgroundColor: tokens.colorNeutralBackground2,
                                      borderRadius: tokens.borderRadiusSmall,
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <div>
                                      <FluentText size={300} weight="semibold" style={{ display: 'block' }}>
                                        Pattern: {pattern.pattern_label || pattern.domain_value}
                                      </FluentText>
                                      {pattern.inferred_datatype && (
                                        <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                                          {pattern.inferred_datatype}
                                        </FluentText>
                                      )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <FluentText size={300} weight="semibold">
                                        {pattern.satisfied_count.toLocaleString()}
                                      </FluentText>
                                      <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                                        {pattern.satisfied_count_percent.toFixed(2)}%
                                      </FluentText>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Data Types */}
                        {columnDataTypes.length > 0 && (
                          <>
                            <Divider style={{ marginBottom: tokens.spacingVerticalL }} />
                            <div style={{ marginBottom: tokens.spacingVerticalL }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                                <FluentText size={400} weight="semibold">
                                  Data Types
                                </FluentText>
                                <APIInfoPopover
                                  title="Column Data Types API"
                                  endpoint={`/metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/DataTypes?runKey={runKey}`}
                                  method="GET"
                                  description="Fetches documented and inferred data types with frequency distribution"
                                  baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                                  parameters={{
                                    profileId: profileId as string || 'profile-uuid',
                                    columnId: columnIdExternal || 'column-uuid',
                                    runKey: run?.run_key || '1'
                                  }}
                                  responseExample={[{
                                    inferredDatatype: "String(11)",
                                    frequency: 500,
                                    frequencyPercent: 47.8
                                  }]}
                                  highlightedFields={['inferredDatatype', 'frequency', 'frequencyPercent']}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
                                {columnDataTypes.slice(0, 5).map((dt, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: tokens.spacingVerticalM,
                                      backgroundColor: tokens.colorNeutralBackground2,
                                      borderRadius: tokens.borderRadiusSmall,
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <div>
                                      <FluentText size={300} weight="semibold">
                                        {dt.inferred_datatype}
                                      </FluentText>
                                      <Badge appearance="tint" size="small" style={{ marginTop: tokens.spacingVerticalXXS }}>
                                        {dt.datatype_category}
                                      </Badge>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <FluentText size={300} weight="semibold">
                                        {dt.frequency.toLocaleString()}
                                      </FluentText>
                                      <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                                        {dt.frequency_percent.toFixed(2)}%
                                      </FluentText>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Top Values */}
                        {columnFrequencies.length > 0 && (
                          <>
                            <Divider style={{ marginBottom: tokens.spacingVerticalL }} />
                            <div style={{ marginBottom: tokens.spacingVerticalL }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                                <FluentText size={400} weight="semibold">
                                  Top Values
                                </FluentText>
                                <APIInfoPopover
                                  title="Value Frequencies API"
                                  endpoint={`/metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/ValueFrequencies?runKey={runKey}`}
                                  method="GET"
                                  description="Fetches most frequent column values with occurrence counts"
                                  baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                                  parameters={{
                                    profileId: profileId as string || 'profile-uuid',
                                    columnId: columnIdExternal || 'column-uuid',
                                    runKey: run?.run_key || '1'
                                  }}
                                  responseExample={[{
                                    columnValue: "USA",
                                    frequency: 250,
                                    percent: 23.9
                                  }]}
                                  highlightedFields={['columnValue', 'frequency', 'percent']}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
                                {columnFrequencies.slice(0, 10).map((vf, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: tokens.spacingVerticalM,
                                      backgroundColor: tokens.colorNeutralBackground2,
                                      borderRadius: tokens.borderRadiusSmall,
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>
                                        Rank #{vf.value_rank}
                                      </FluentText>
                                      <FluentText size={300} weight="semibold">
                                        {vf.column_value === null || vf.column_value === '' ? (
                                          <span style={{ color: tokens.colorPaletteRedForeground1, fontStyle: 'italic' }}>NULL</span>
                                        ) : (
                                          `"${vf.column_value}"`
                                        )}
                                      </FluentText>
                                      {vf.is_outlier === 1 && (
                                        <Badge appearance="filled" color="danger" size="small" style={{ marginTop: tokens.spacingVerticalXXS }}>
                                          Outlier
                                        </Badge>
                                      )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <FluentText size={300} weight="semibold">
                                        {vf.frequency.toLocaleString()}
                                      </FluentText>
                                      <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                                        {vf.percent.toFixed(2)}%
                                      </FluentText>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Additional Metrics */}
                        {Object.keys(advancedMetrics).length > 0 && (
                          <>
                            <Divider style={{ marginBottom: tokens.spacingVerticalL }} />
                            <div>
                              <FluentText size={400} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalM }}>
                                Additional Metrics
                              </FluentText>
                              <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                {Object.entries(advancedMetrics).map(([metricKey, metricValue]) => {
                                  const displayValue = typeof metricValue === 'number'
                                    ? (metricKey.includes('PERCENT') || metricKey.includes('RATE')
                                      ? `${metricValue.toFixed(2)}%`
                                      : metricValue.toLocaleString())
                                    : metricValue;

                                  return (
                                    <div
                                      key={metricKey}
                                      style={{
                                        padding: tokens.spacingVerticalM,
                                        backgroundColor: tokens.colorNeutralBackground1,
                                        borderRadius: tokens.borderRadiusSmall,
                                        border: `1px solid ${tokens.colorNeutralStroke2}`
                                      }}
                                    >
                                      <FluentText
                                        size={200}
                                        style={{
                                          color: tokens.colorNeutralForeground3,
                                          display: 'block',
                                          marginBottom: tokens.spacingVerticalXXS
                                        }}
                                      >
                                        {metricKey.replace(/_/g, ' ')}
                                      </FluentText>
                                      <FluentText
                                        size={500}
                                        weight="semibold"
                                        style={{ display: 'block', fontFamily: 'monospace' }}
                                      >
                                        {displayValue}
                                      </FluentText>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </>
            )}

            {/* Rule Statistics Tab */}
            {selectedTab === 'rule' && (
              <>
                {ruleStatistics.length > 0 ? (
                  ruleStatistics.map((rule) => (
                    <Card key={rule.rule_mapplet_id} className={styles.card}>
                      <div style={{ padding: tokens.spacingVerticalL }}>
                        {/* Rule Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacingVerticalL }}>
                          <div className={styles.sectionHeader}>
                            <CheckmarkCircle24Regular />
                            <div>
                              <Title3 style={{ marginBottom: tokens.spacingVerticalXXS }}>
                                {rule.name || rule.frs_id}
                              </Title3>
                              <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalXXS, flexWrap: 'wrap' }}>
                                <Badge appearance="outline" color="informative">{rule.rule_type}</Badge>
                                {rule.dimension && (
                                  <Badge appearance="outline" color="brand">{rule.dimension}</Badge>
                                )}
                                {rule.is_exception && (
                                  <Badge appearance="filled" color="danger">Exception Rule</Badge>
                                )}
                              </div>
                              {rule.description && (
                                <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, marginTop: tokens.spacingVerticalXS, display: 'block' }}>
                                  {rule.description}
                                </FluentText>
                              )}
                            </div>
                          </div>
                          <APIInfoPopover
                            title="FRS Rule Metadata API"
                            endpoint="/frs/api/v1/Documents"
                            method="GET"
                            description="Fetches rule metadata including name, description, document type, and custom attributes (dimension, exception flag)"
                            baseUrl="https://na1.dm-us.informaticacloud.com"
                            parameters={{
                              "$filter": `id eq '${rule.frs_id}'`
                            }}
                            responseExample={{
                              value: [{
                                id: rule.frs_id,
                                name: rule.name,
                                description: rule.description,
                                documentType: rule.rule_type,
                                customAttributes: {
                                  stringAttrs: [
                                    { name: "DIMENSION", value: rule.dimension },
                                    { name: "EXCEPTION", value: String(rule.is_exception) }
                                  ]
                                }
                              }]
                            }}
                            highlightedFields={['name', 'documentType', 'customAttributes']}
                          />
                        </div>

                        <Divider style={{ marginBottom: tokens.spacingVerticalL }} />

                        {/* Input Mappings Section */}
                        <div style={{ marginBottom: tokens.spacingVerticalL }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                            <FluentText size={400} weight="semibold">
                              Input Mappings
                            </FluentText>
                            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              Source columns feeding this rule
                            </FluentText>
                          </div>
                          {rule.input_mappings.length > 0 ? (
                            <div className={styles.tableContainer}>
                              <Table size="small" className={styles.table}>
                                <TableHeader>
                                  <TableRow>
                                    <TableHeaderCell>Source Column</TableHeaderCell>
                                    <TableHeaderCell>→</TableHeaderCell>
                                    <TableHeaderCell>Rule Input Port</TableHeaderCell>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rule.input_mappings.map((input, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>
                                        <TableCellLayout>
                                          <Badge appearance="filled" color="informative">
                                            {input.data_source_field_name}
                                          </Badge>
                                        </TableCellLayout>
                                      </TableCell>
                                      <TableCell>
                                        <TableCellLayout>
                                          <ChevronRight16Regular />
                                        </TableCellLayout>
                                      </TableCell>
                                      <TableCell>
                                        <TableCellLayout>
                                          <FluentText weight="semibold">{input.in_field_name}</FluentText>
                                        </TableCellLayout>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, fontStyle: 'italic' }}>
                              No input mappings configured
                            </FluentText>
                          )}
                        </div>

                        <Divider style={{ marginBottom: tokens.spacingVerticalL }} />

                        {/* Output Mappings Section */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                            <FluentText size={400} weight="semibold">
                              Output Statistics
                            </FluentText>
                            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              Rule output columns with profiling metrics
                            </FluentText>
                          </div>

                          {rule.output_mappings.length > 0 ? (
                            rule.output_mappings.map((output, idx) => (
                              <div
                                key={idx}
                                style={{
                                  marginBottom: tokens.spacingVerticalL,
                                  padding: tokens.spacingVerticalL,
                                  backgroundColor: tokens.colorNeutralBackground2,
                                  borderRadius: tokens.borderRadiusMedium,
                                  border: `1px solid ${tokens.colorNeutralStroke1}`
                                }}
                              >
                                {/* Output Column Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                                  <div>
                                    <FluentText size={400} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalXXS }}>
                                      {output.out_field_name}
                                    </FluentText>
                                    <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center' }}>
                                      <Badge appearance="outline" size="small">
                                        Key: {output.column_key}
                                      </Badge>
                                      <Badge appearance="outline" size="small" color="success">
                                        {output.datatype}
                                      </Badge>
                                      <Badge appearance="tint" size="small">
                                        {output.metric_count} metrics
                                      </Badge>
                                    </div>
                                  </div>
                                  <APIInfoPopover
                                    title="Rule Output Statistics API"
                                    endpoint={`/metric-store/api/v1/odata/Profiles('{profileId}')/Columns?runKey={runKey}`}
                                    method="GET"
                                    description="Fetches statistics for rule output columns (MAPPLETFIELD). The runKey parameter is critical to get data for the specific run."
                                    baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                                    parameters={{
                                      profileId: profileId as string || 'profile-uuid',
                                      runKey: run?.run_key || '1'
                                    }}
                                    responseExample={{
                                      value: [{
                                        columnKey: output.column_key,
                                        columnName: output.out_field_name,
                                        columnType: "MAPPLETFIELD",
                                        totalRows: 1671,
                                        nulCount: 0,
                                        nulPercent: 0,
                                        distinctCount: 5,
                                        distinctPercent: 0.3
                                      }]
                                    }}
                                    highlightedFields={['columnName', 'columnType', 'columnKey', 'totalRows']}
                                  />
                                </div>

                                {/* Metrics Grid - IDMC Style */}
                                <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                  {Object.entries(output.metrics).map(([metricKey, metricValue]) => {
                                    const displayValue = typeof metricValue === 'number'
                                      ? (metricKey.includes('PERCENT') || metricKey.includes('RATE')
                                        ? `${metricValue.toFixed(2)}%`
                                        : metricValue.toLocaleString())
                                      : metricValue;

                                    return (
                                      <div
                                        key={metricKey}
                                        style={{
                                          padding: tokens.spacingVerticalM,
                                          backgroundColor: tokens.colorNeutralBackground1,
                                          borderRadius: tokens.borderRadiusSmall,
                                          border: `1px solid ${tokens.colorNeutralStroke2}`
                                        }}
                                      >
                                        <FluentText
                                          size={200}
                                          style={{
                                            color: tokens.colorNeutralForeground3,
                                            display: 'block',
                                            marginBottom: tokens.spacingVerticalXXS
                                          }}
                                        >
                                          {metricKey.replace(/_/g, ' ')}
                                        </FluentText>
                                        <FluentText
                                          size={500}
                                          weight="semibold"
                                          style={{ display: 'block', fontFamily: 'monospace' }}
                                        >
                                          {displayValue}
                                        </FluentText>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Top Values for Rule Outputs */}
                                {(() => {
                                  const outputFrequencies = Array.isArray(valueFrequencies)
                                    ? valueFrequencies.filter(vf => vf.column_name === output.out_field_name)
                                    : [];

                                  if (outputFrequencies.length === 0) return null;

                                  return (
                                    <>
                                      <Divider style={{ marginTop: tokens.spacingVerticalL, marginBottom: tokens.spacingVerticalM }} />
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                                          <FluentText size={400} weight="semibold">
                                            Top Values
                                          </FluentText>
                                          <APIInfoPopover
                                            title="Value Frequencies API"
                                            endpoint={`/metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/ValueFrequencies?runKey={runKey}`}
                                            method="GET"
                                            description="Fetches most frequent values for rule output columns"
                                            baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                                            parameters={{
                                              profileId: profileId as string || 'profile-uuid',
                                              columnId: 'column-uuid',
                                              runKey: run?.run_key || '1'
                                            }}
                                            responseExample={[{
                                              columnValue: "VALID",
                                              frequency: 250,
                                              percent: 23.9
                                            }]}
                                            highlightedFields={['columnValue', 'frequency', 'percent']}
                                          />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
                                          {outputFrequencies.slice(0, 10).map((vf, vfIdx) => (
                                            <div
                                              key={vfIdx}
                                              style={{
                                                padding: tokens.spacingVerticalM,
                                                backgroundColor: tokens.colorNeutralBackground1,
                                                borderRadius: tokens.borderRadiusSmall,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                              }}
                                            >
                                              <div style={{ flex: 1 }}>
                                                <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>
                                                  Rank #{vf.value_rank}
                                                </FluentText>
                                                <FluentText size={300} weight="semibold">
                                                  {vf.column_value === null || vf.column_value === '' ? (
                                                    <span style={{ color: tokens.colorPaletteRedForeground1, fontStyle: 'italic' }}>NULL</span>
                                                  ) : (
                                                    `"${vf.column_value}"`
                                                  )}
                                                </FluentText>
                                                {vf.is_outlier === 1 && (
                                                  <Badge appearance="filled" color="danger" size="small" style={{ marginTop: tokens.spacingVerticalXXS }}>
                                                    Outlier
                                                  </Badge>
                                                )}
                                              </div>
                                              <div style={{ textAlign: 'right' }}>
                                                <FluentText size={300} weight="semibold">
                                                  {vf.frequency.toLocaleString()}
                                                </FluentText>
                                                <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                                                  {vf.percent.toFixed(2)}%
                                                </FluentText>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            ))
                          ) : (
                            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, fontStyle: 'italic' }}>
                              No output statistics available
                            </FluentText>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className={styles.card}>
                    <div style={{ padding: tokens.spacingVerticalXXL, textAlign: 'center' }}>
                      <CheckmarkCircle24Regular style={{ fontSize: '48px', color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalM }} />
                      <Title3 style={{ marginBottom: tokens.spacingVerticalS }}>No Rule Statistics Available</Title3>
                      <Body1 style={{ color: tokens.colorNeutralForeground3 }}>
                        This profiling run does not include any data quality rules.
                      </Body1>
                    </div>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
