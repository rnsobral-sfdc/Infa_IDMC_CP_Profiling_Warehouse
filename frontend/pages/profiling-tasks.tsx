import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Input,
  Label,
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
  Divider,
  TableHeaderCellProps,
  Link,
} from '@fluentui/react-components';
import {
  ArrowSync24Regular,
  Filter24Regular,
  Calendar24Regular,
  ArrowSortUp20Regular,
  ArrowSortDown20Regular,
  ChevronRight16Regular,
} from '@fluentui/react-icons';
import Layout from '../src/components/Layout';
import { api } from '../src/lib/api';
import { useRouter } from 'next/router';
import { APIInfoPopover } from '../src/components/APIInfoPopover';
import { PageHeader } from '../src/components/PageHeader';
import { TaskInfoPopover } from '../src/components/TaskInfoPopover';

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
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalL,
  },
  filterField: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalL,
  },
  statCard: {
    padding: tokens.spacingVerticalM,
    textAlign: 'center',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    minWidth: '100%',
    tableLayout: 'fixed',
  },
  hierarchyCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  hierarchyPath: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  profilingName: {
    fontSize: '14px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  filterActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalM,
  },
  sortableHeader: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  columnFilterInput: {
    marginTop: tokens.spacingVerticalXXS,
  },
});

interface ProfilingTask {
  task_id: string;
  task_name: string;
  task_type: string;
  object_name: string;
  project_name: string;
  project_id?: string;
  project_display_name?: string;
  folder_name: string;
  folder_id?: string;
  folder_display_name?: string;
  frs_id?: string;
  first_pulled: string;
  last_synced: string;
  run_count: number;
  last_run_time?: string;
  sync_status: 'success' | 'failed' | 'pending';
}

type SortDirection = 'asc' | 'desc' | null;
type SortKey = keyof ProfilingTask;

export default function ProfilingTasksPage() {
  const styles = useStyles();
  const router = useRouter();
  const [tasks, setTasks] = useState<ProfilingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('project_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [globalFilters, setGlobalFilters] = useState({
    search: '',
    project_name: '',
    folder_name: '',
    created_by: '',
    date_from: '',
    date_to: ''
  });

  const [columnFilters, setColumnFilters] = useState({
    task_name: '',
    project_name: '',
    folder_name: '',
    first_pulled: '',
    run_count: '',
    last_run_time: '',
    last_synced: '',
    sync_status: '',
  });

  useEffect(() => {
    loadTasks();

    // Listen for connection changes
    const handleConnectionChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Connection changed, reloading tasks...', customEvent.detail);
      // Reload tasks for the new organization
      loadTasks();
    };

    window.addEventListener('connection-changed', handleConnectionChange);

    return () => {
      window.removeEventListener('connection-changed', handleConnectionChange);
    };
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProfilingTaskSummary(globalFilters) as ProfilingTask[];
      setTasks(data);

      // If no tasks, check if there's an active connection
      if (data.length === 0) {
        try {
          const connections = await api.getConnections() as any[];
          const hasActiveConnection = connections.some(c => c.last_test_status === 'SUCCESS');

          if (!hasActiveConnection) {
            setError('No active connection. Please connect to an IDMC organization first.');
          }
        } catch (connErr) {
          console.error('Error checking connections:', connErr);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profiling tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleGlobalFilterChange(key: string, value: string) {
    setGlobalFilters({ ...globalFilters, [key]: value });
  }

  function handleColumnFilterChange(key: keyof typeof columnFilters, value: string) {
    setColumnFilters({ ...columnFilters, [key]: value });
  }

  function handleApplyFilters() {
    loadTasks();
  }

  function handleClearFilters() {
    setGlobalFilters({
      search: '',
      project_name: '',
      folder_name: '',
      created_by: '',
      date_from: '',
      date_to: ''
    });
    setColumnFilters({
      task_name: '',
      project_name: '',
      folder_name: '',
      first_pulled: '',
      run_count: '',
      last_run_time: '',
      last_synced: '',
      sync_status: '',
    });
    setTimeout(() => loadTasks(), 100);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') {
        setSortKey('project_name'); // Reset to default
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Apply column filters
    result = result.filter(task => {
      return Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;

        // Special handling for project and folder filters - search in display_name fields too
        if (key === 'project_name') {
          const projectName = String(task.project_name || '').toLowerCase();
          const projectDisplayName = String(task.project_display_name || '').toLowerCase();
          return projectName.includes(value.toLowerCase()) || projectDisplayName.includes(value.toLowerCase());
        }

        if (key === 'folder_name') {
          const folderName = String(task.folder_name || '').toLowerCase();
          const folderDisplayName = String(task.folder_display_name || '').toLowerCase();
          return folderName.includes(value.toLowerCase()) || folderDisplayName.includes(value.toLowerCase());
        }

        const taskValue = String(task[key as keyof ProfilingTask] || '').toLowerCase();
        return taskValue.includes(value.toLowerCase());
      });
    });

    // Sort
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    } else {
      // Default sort: project > folder > task name
      result.sort((a, b) => {
        const projectCompare = (a.project_name || '').localeCompare(b.project_name || '');
        if (projectCompare !== 0) return projectCompare;

        const folderCompare = (a.folder_name || '').localeCompare(b.folder_name || '');
        if (folderCompare !== 0) return folderCompare;

        return (a.task_name || '').localeCompare(b.task_name || '');
      });
    }

    return result;
  }, [tasks, columnFilters, sortKey, sortDirection]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <Badge appearance="filled" color="success">Success</Badge>;
      case 'failed':
        return <Badge appearance="filled" color="danger">Failed</Badge>;
      default:
        return <Badge appearance="outline" color="warning">Pending</Badge>;
    }
  };

  const renderSortableHeader = (label: string, key: SortKey) => {
    const isActive = sortKey === key;
    return (
      <div className={styles.sortableHeader} onClick={() => handleSort(key)}>
        <FluentText weight="semibold">{label}</FluentText>
        {isActive && sortDirection === 'asc' && <ArrowSortUp20Regular />}
        {isActive && sortDirection === 'desc' && <ArrowSortDown20Regular />}
      </div>
    );
  };

  // Get the most recent sync time
  const lastSyncTime = useMemo(() => {
    const syncTimes = tasks
      .map(t => t.last_synced)
      .filter(t => t)
      .map(t => new Date(t).getTime());
    return syncTimes.length > 0 ? new Date(Math.max(...syncTimes)) : null;
  }, [tasks]);

  const stats = {
    total: tasks.length,
    filtered: filteredAndSortedTasks.length,
    lastSync: lastSyncTime,
    successful: tasks.filter(t => t.sync_status === 'success').length,
    failed: tasks.filter(t => t.sync_status === 'failed').length,
    pending: tasks.filter(t => t.sync_status === 'pending').length,
  };

  return (
    <Layout>
      <div className={styles.container}>
        <PageHeader
          title="Profiling Tasks"
          subtitle="View and manage all profiling tasks from IDMC"
          apiHint={{
            step: "Step 3 in API Flow: List Profiling Tasks",
            description: "Displays all profiling tasks extracted from IDMC. Click any task to see its runs and detailed column statistics. Use the info icon (i) to see API details."
          }}
          actions={
            <>
              <APIInfoPopover
                title="Profiling Tasks API - List All Profiles"
                endpoint="/profiling-service/api/v1/profile"
                baseUrl="https://na1-dqprofile.dm-us.informaticacloud.com"
                method="GET"
                description="Fetches all profiling tasks/profiles from IDMC Profiling Service. The profile 'id' field is the primary key used to get run history and detailed column statistics. This data is synced into our star schema for analysis."
                keyFields={[
                  {
                    label: 'Profile ID',
                    value: 'profile.id (e.g., 9888c0c3-aba8-4094-b299-751bd1691795)',
                    usedIn: 'GET /profiling-service/api/v1/profile/{id}/runs - Get all runs for this profile'
                  },
                  {
                    label: 'frsId',
                    value: 'profile.frsId (e.g., 6oz0QnsasyVh9CrtNpr8gK)',
                    usedIn: 'GET /saas/public/core/v3/objects?q=type==\'PROFILE\' - Match to object.id to get full path (project/folder/name)'
                  },
                  {
                    label: 'Session ID',
                    value: '<from login response>',
                    usedIn: 'Header: IDS-SESSION-ID for profiling APIs, INFA-SESSION-ID for objects API'
                  },
                  {
                    label: 'Data Flow',
                    value: 'IDMC Profiling Service → Our Backend → Star Schema (DimProfilingTask)',
                    usedIn: 'This data is extracted, transformed, and loaded into our database for dashboard display'
                  }
                ]}
                responseExample={[{
                  id: "9888c0c3-aba8-4094-b299-751bd1691795",
                  name: "aa_iw_22_roundtable",
                  frsId: "0YKARGOBb2wdyeq1scnO6e",
                  frsProjectId: "5CXcJvMufMRcrWHj89a5KP",
                  frsFolderId: "8XfgK2NpqTRhsWLm71d4HP",
                  profileType: "COLUMN_PROFILE",
                  createdByName: "dqpmuser",
                  createTime: "2023-06-15T10:30:00Z"
                }]}
                highlightedFields={['id', 'name', 'frsId']}
              />
              <Button
                appearance="subtle"
                icon={<Filter24Regular />}
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button
                appearance="primary"
                icon={<ArrowSync24Regular />}
                onClick={loadTasks}
                disabled={loading}
              >
                Refresh
              </Button>
            </>
          }
        />

        {/* Statistics Cards */}
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>Total Tasks</FluentText>
            <FluentText size={300} weight="semibold">{stats.total}</FluentText>
          </Card>
          <Card className={styles.statCard}>
            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>Showing</FluentText>
            <FluentText size={300} weight="semibold">{stats.filtered}</FluentText>
          </Card>
          <Card className={styles.statCard}>
            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: tokens.spacingVerticalXXS }}>Last Synchronized</FluentText>
            <FluentText size={300}>
              {stats.lastSync ? (
                `${stats.lastSync.toLocaleDateString()} ${stats.lastSync.toLocaleTimeString()}`
              ) : (
                'Never'
              )}
            </FluentText>
          </Card>
          <Card className={styles.statCard}>
            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalXS }}>Status</FluentText>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FluentText size={300} style={{ color: tokens.colorPaletteGreenForeground1 }}>Successful</FluentText>
                <FluentText size={400} weight="bold" style={{ color: tokens.colorPaletteGreenForeground1 }}>{stats.successful}</FluentText>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FluentText size={300} style={{ color: tokens.colorPaletteRedForeground1 }}>Failed</FluentText>
                <FluentText size={400} weight="bold" style={{ color: tokens.colorPaletteRedForeground1 }}>{stats.failed}</FluentText>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FluentText size={300} style={{ color: tokens.colorPaletteYellowForeground1 }}>Pending</FluentText>
                <FluentText size={400} weight="bold" style={{ color: tokens.colorPaletteYellowForeground1 }}>{stats.pending}</FluentText>
              </div>
            </div>
          </Card>
        </div>

        {/* Global Filters */}
        {showFilters && (
          <Card className={styles.card}>
            <div style={{ padding: tokens.spacingVerticalL }}>
              <FluentText size={400} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
                Global Filters
              </FluentText>

              <div className={styles.filterGrid}>
                <div className={styles.filterField}>
                  <Label>Profiling Name</Label>
                  <Input
                    placeholder="Search by name..."
                    value={globalFilters.search}
                    onChange={(e) => handleGlobalFilterChange('search', e.target.value)}
                  />
                </div>

                <div className={styles.filterField}>
                  <Label>Project</Label>
                  <Input
                    placeholder="Filter by project..."
                    value={globalFilters.project_name}
                    onChange={(e) => handleGlobalFilterChange('project_name', e.target.value)}
                  />
                </div>

                <div className={styles.filterField}>
                  <Label>Folder</Label>
                  <Input
                    placeholder="Filter by folder..."
                    value={globalFilters.folder_name}
                    onChange={(e) => handleGlobalFilterChange('folder_name', e.target.value)}
                  />
                </div>

                <div className={styles.filterField}>
                  <Label>Created By</Label>
                  <Input
                    placeholder="Filter by user..."
                    value={globalFilters.created_by}
                    onChange={(e) => handleGlobalFilterChange('created_by', e.target.value)}
                  />
                </div>

                <div className={styles.filterField}>
                  <Label>
                    <Calendar24Regular style={{ marginRight: tokens.spacingHorizontalXS }} />
                    Date From
                  </Label>
                  <Input
                    type="date"
                    value={globalFilters.date_from}
                    onChange={(e) => handleGlobalFilterChange('date_from', e.target.value)}
                  />
                </div>

                <div className={styles.filterField}>
                  <Label>
                    <Calendar24Regular style={{ marginRight: tokens.spacingHorizontalXS }} />
                    Date To
                  </Label>
                  <Input
                    type="date"
                    value={globalFilters.date_to}
                    onChange={(e) => handleGlobalFilterChange('date_to', e.target.value)}
                  />
                </div>
              </div>

              <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />

              <div className={styles.filterActions}>
                <Button appearance="primary" onClick={handleApplyFilters}>
                  Apply Filters
                </Button>
                <Button onClick={handleClearFilters}>
                  Clear All
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXXXL }}>
            <Spinner label="Loading profiling tasks..." size="large" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className={styles.card}>
            <div style={{ padding: tokens.spacingVerticalL, textAlign: 'center' }}>
              <FluentText style={{ color: tokens.colorPaletteRedForeground1, marginBottom: tokens.spacingVerticalM, display: 'block' }}>
                {error}
              </FluentText>
              <Button onClick={loadTasks}>Retry</Button>
            </div>
          </Card>
        )}

        {/* Tasks Table */}
        {!loading && !error && (
          <Card className={styles.card}>
            <div className={styles.tableContainer}>
              <Table size="small" className={styles.table}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell style={{ width: '35%' }}>
                      {renderSortableHeader('Hierarchy (Project / Folder / Name)', 'project_name')}
                      <Input
                        size="small"
                        className={styles.columnFilterInput}
                        placeholder="Filter..."
                        value={columnFilters.task_name}
                        onChange={(e) => handleColumnFilterChange('task_name', e.target.value)}
                      />
                    </TableHeaderCell>
                    <TableHeaderCell style={{ width: '12%' }}>
                      {renderSortableHeader('Created', 'first_pulled')}
                      <Input
                        size="small"
                        className={styles.columnFilterInput}
                        placeholder="Filter..."
                        value={columnFilters.first_pulled}
                        onChange={(e) => handleColumnFilterChange('first_pulled', e.target.value)}
                      />
                    </TableHeaderCell>
                    <TableHeaderCell style={{ width: '8%' }}>
                      {renderSortableHeader('Runs', 'run_count')}
                      <Input
                        size="small"
                        className={styles.columnFilterInput}
                        placeholder="Filter..."
                        value={columnFilters.run_count}
                        onChange={(e) => handleColumnFilterChange('run_count', e.target.value)}
                      />
                    </TableHeaderCell>
                    <TableHeaderCell style={{ width: '15%' }}>
                      {renderSortableHeader('Last Run', 'last_run_time')}
                      <Input
                        size="small"
                        className={styles.columnFilterInput}
                        placeholder="Filter..."
                        value={columnFilters.last_run_time}
                        onChange={(e) => handleColumnFilterChange('last_run_time', e.target.value)}
                      />
                    </TableHeaderCell>
                    <TableHeaderCell style={{ width: '15%' }}>
                      {renderSortableHeader('Last Sync', 'last_synced')}
                      <Input
                        size="small"
                        className={styles.columnFilterInput}
                        placeholder="Filter..."
                        value={columnFilters.last_synced}
                        onChange={(e) => handleColumnFilterChange('last_synced', e.target.value)}
                      />
                    </TableHeaderCell>
                    <TableHeaderCell style={{ width: '15%' }}>
                      {renderSortableHeader('Status', 'sync_status')}
                      <Input
                        size="small"
                        className={styles.columnFilterInput}
                        placeholder="Filter..."
                        value={columnFilters.sync_status}
                        onChange={(e) => handleColumnFilterChange('sync_status', e.target.value)}
                      />
                    </TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div style={{ textAlign: 'center', padding: tokens.spacingVerticalXXL }}>
                          <FluentText>No profiling tasks found. Run a sync job to pull data from IDMC.</FluentText>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedTasks.map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell>
                          <TableCellLayout>
                            <div className={styles.hierarchyCell}>
                              <span className={styles.hierarchyPath}>
                                {task.project_display_name || task.project_name || 'No Project'}
                                {(task.folder_display_name || task.folder_name) && ` / ${task.folder_display_name || task.folder_name}`}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS }}>
                                {task.run_count > 0 ? (
                                  <Link
                                    href={`/profiling-task-runs?taskId=${task.task_id}&taskName=${encodeURIComponent(task.task_name)}`}
                                    className={styles.profilingName}
                                    style={{ textDecoration: 'none', fontWeight: tokens.fontWeightSemibold }}
                                  >
                                    {task.task_name}
                                  </Link>
                                ) : (
                                  <span className={styles.profilingName}>
                                    {task.task_name}
                                  </span>
                                )}
                                <TaskInfoPopover
                                  profilingId={task.task_id}
                                  frsId={task.frs_id}
                                  frsProjectId={task.project_id}
                                  frsFolderId={task.folder_id}
                                  connectionId={(task as any).connection_id}
                                  isFilterEnabled={(task as any).is_filter_enabled}
                                  samplingOptions={(task as any).sampling_options}
                                />
                              </div>
                            </div>
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {task.first_pulled
                              ? new Date(task.first_pulled).toLocaleDateString()
                              : '-'}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {task.run_count > 0 ? (
                              <Link
                                href={`/profiling-task-runs?taskId=${task.task_id}&taskName=${encodeURIComponent(task.task_name)}`}
                                style={{ textDecoration: 'none' }}
                              >
                                <Badge
                                  appearance="outline"
                                  style={{ cursor: 'pointer', fontWeight: tokens.fontWeightSemibold }}
                                >
                                  {task.run_count}
                                </Badge>
                              </Link>
                            ) : (
                              <Badge appearance="outline" style={{ color: tokens.colorNeutralForeground4 }}>0</Badge>
                            )}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {task.last_run_time
                              ? new Date(task.last_run_time).toLocaleString()
                              : <FluentText italic>No runs yet</FluentText>}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {task.last_synced
                              ? new Date(task.last_synced).toLocaleString()
                              : '-'}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            {getStatusBadge(task.sync_status)}
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
