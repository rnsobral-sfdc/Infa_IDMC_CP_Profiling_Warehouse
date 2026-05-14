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
  Badge,
  Spinner,
  Text as FluentText,
  Title3,
  Body1,
  makeStyles,
  tokens,
  Link,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbButton,
} from '@fluentui/react-components';
import {
  ArrowLeft24Regular,
  ArrowSync24Regular,
  ChevronRight16Regular,
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
    tableLayout: 'fixed',
  },
  breadcrumb: {
    marginBottom: tokens.spacingVerticalL,
  },
  clickableRow: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
});

interface ProfilingRun {
  profiling_run_id: string;
  profiling_task_id: string;
  run_key: string;
  run_status: string;
  run_start_time: string;
  run_end_time?: string;
  run_duration_seconds?: number;
  row_count?: number;
  error_message?: string;
}

export default function ProfilingTaskRunsPage() {
  const styles = useStyles();
  const router = useRouter();
  const { taskId, taskName } = router.query;

  const [runs, setRuns] = useState<ProfilingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      loadRuns();
    }
  }, [taskId]);

  async function loadRuns() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProfilingTaskRuns(taskId as string) as ProfilingRun[];
      // Sort by run_key descending (most recent first)
      const sortedData = data.sort((a, b) => {
        const keyA = parseInt(a.run_key) || 0;
        const keyB = parseInt(b.run_key) || 0;
        return keyB - keyA;
      });
      setRuns(sortedData);
    } catch (err: any) {
      setError(err.message || 'Failed to load profiling runs');
      console.error('Error loading runs:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'COMPLETED':
        return <Badge appearance="filled" color="success">Success</Badge>;
      case 'FAILED':
      case 'ERROR':
        return <Badge appearance="filled" color="danger">Failed</Badge>;
      case 'RUNNING':
        return <Badge appearance="filled" color="informative">Running</Badge>;
      default:
        return <Badge appearance="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleRowClick = (runId: string, runKey: string) => {
    router.push(`/profiling-run-details?runId=${runId}&taskName=${encodeURIComponent(taskName as string)}&runKey=${runKey}`);
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
              <BreadcrumbButton current>{taskName || taskId}</BreadcrumbButton>
            </BreadcrumbItem>
          </Breadcrumb>
        </div>

        <PageHeader
          title="Profiling Runs"
          subtitle={`Task: ${taskName || taskId}`}
          actions={
            <>
              <APIInfoPopover
                title="Profiling Runs API - List All Runs"
                endpoint={`/profiling-service/api/v1/profile/${taskId}/runs`}
                baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                method="GET"
                description="Get all profiling runs for a specific profile task. This API returns all historical execution runs with their status, timing, and row counts."
                parameters={{
                  profileId: taskId as string
                }}
                keyFields={[
                  {
                    label: 'Profile ID',
                    value: `${taskId}`,
                    usedIn: 'Used in URL path: /profiling-service/api/v1/profile/{profileId}/runs'
                  },
                  {
                    label: 'Run Key',
                    value: 'run.runKey (e.g., 1, 2, 3...)',
                    usedIn: 'Used to fetch column details: GET /profiling-service/api/v1/profile/{profileId}/run/{runKey}'
                  },
                  {
                    label: 'Session ID',
                    value: '<from login response>',
                    usedIn: 'Header: IDS-SESSION-ID required for all profiling service APIs'
                  }
                ]}
                responseExample={[{
                  runKey: "1",
                  status: "Success",
                  startTime: "2023-06-15T10:30:00Z",
                  endTime: "2023-06-15T10:35:00Z",
                  executionTime: 300000,
                  rowCount: 1500,
                  runId: "abc123..."
                }]}
                highlightedFields={['runKey', 'status', 'rowCount']}
              />
              <Button
                icon={<ArrowLeft24Regular />}
                onClick={() => router.push('/profiling-tasks')}
              >
                Back to Tasks
              </Button>
              <Button
                appearance="primary"
                icon={<ArrowSync24Regular />}
                onClick={loadRuns}
                disabled={loading}
              >
                Refresh
              </Button>
            </>
          }
        />

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXXXL }}>
            <Spinner label="Loading profiling runs..." size="large" />
          </div>
        )}

        {error && (
          <Card className={styles.card}>
            <div style={{ padding: tokens.spacingVerticalL, textAlign: 'center' }}>
              <FluentText style={{ color: tokens.colorPaletteRedForeground1, marginBottom: tokens.spacingVerticalM, display: 'block' }}>
                {error}
              </FluentText>
              <Button onClick={loadRuns}>Retry</Button>
            </div>
          </Card>
        )}

        {!loading && !error && (
          <Card className={styles.card}>
            <div className={styles.tableContainer}>
              <Table size="small" className={styles.table}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell style={{ width: '12%' }}>Run Key</TableHeaderCell>
                    <TableHeaderCell style={{ width: '10%' }}>Status</TableHeaderCell>
                    <TableHeaderCell style={{ width: '18%' }}>Start Time</TableHeaderCell>
                    <TableHeaderCell style={{ width: '18%' }}>End Time</TableHeaderCell>
                    <TableHeaderCell style={{ width: '10%' }}>Duration</TableHeaderCell>
                    <TableHeaderCell style={{ width: '12%' }}>Row Count</TableHeaderCell>
                    <TableHeaderCell style={{ width: '8%' }}>API Info</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div style={{ textAlign: 'center', padding: tokens.spacingVerticalXXL }}>
                          <FluentText>No profiling runs found for this task.</FluentText>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    runs.map((run) => (
                      <TableRow
                        key={run.profiling_run_id}
                      >
                        <TableCell>
                          <TableCellLayout>
                            <Link
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleRowClick(run.profiling_run_id, run.run_key)}
                            >
                              {run.run_key}
                            </Link>
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {getStatusBadge(run.run_status)}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {run.run_start_time
                              ? new Date(run.run_start_time).toLocaleString()
                              : '-'}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {run.run_end_time
                              ? new Date(run.run_end_time).toLocaleString()
                              : '-'}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {formatDuration(run.run_duration_seconds)}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {run.row_count?.toLocaleString() || '-'}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            <APIInfoPopover
                              title={`Run ${run.run_key} - Column Details API`}
                              endpoint={`/profiling-service/api/v1/profile/${taskId}/run/${run.run_key}`}
                              baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                              method="GET"
                              description={`Get detailed column-level profiling statistics for run ${run.run_key}. This API returns all profiled columns with their data types, patterns, value distributions, and quality metrics.`}
                              parameters={{
                                profileId: taskId as string,
                                runKey: run.run_key
                              }}
                              keyFields={[
                                {
                                  label: 'Profile ID',
                                  value: `${taskId}`,
                                  usedIn: 'Used in URL to identify the profiling task'
                                },
                                {
                                  label: 'Run Key',
                                  value: run.run_key,
                                  usedIn: 'Used in URL to identify this specific execution run'
                                },
                                {
                                  label: 'Run ID',
                                  value: run.profiling_run_id,
                                  usedIn: 'Internal database identifier for this run'
                                },
                                {
                                  label: 'Data Source',
                                  value: 'IDMC Profiling Service',
                                  usedIn: 'This data comes from the IDMC profiling execution and is stored in our star schema'
                                }
                              ]}
                              responseExample={{
                                columns: [
                                  {
                                    columnName: "customer_id",
                                    dataType: "INTEGER",
                                    nullCount: 0,
                                    uniqueCount: 1500,
                                    patterns: ["###-####-####"],
                                    minValue: 1,
                                    maxValue: 1500,
                                    avgValue: 750.5
                                  }
                                ],
                                runKey: run.run_key,
                                status: run.run_status,
                                rowCount: run.row_count
                              }}
                              highlightedFields={['columnName', 'dataType', 'uniqueCount', 'patterns']}
                            />
                          </TableCellLayout>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
