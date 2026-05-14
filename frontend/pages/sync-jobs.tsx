import React, { useState, useEffect } from 'react';
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
  Switch,
  Select,
  Textarea,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  ProgressBar,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Play24Regular,
  Edit24Regular,
  Delete24Regular,
  ArrowSync24Regular,
  CheckmarkCircle24Filled,
  DismissCircle24Filled,
  Clock24Regular,
  Stop24Regular,
  PlayCircle24Regular,
  ErrorCircle24Regular,
  Info24Regular,
} from '@fluentui/react-icons';
import Layout from '../src/components/Layout';
import { api } from '../src/lib/api';
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
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingVerticalL,
    marginTop: tokens.spacingVerticalL,
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    tableLayout: 'auto',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalL,
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },
  statCard: {
    padding: tokens.spacingVerticalM,
    textAlign: 'center',
  },
  progressCard: {
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorBrandBackground2,
    border: `2px solid ${tokens.colorBrandBorder1}`,
  },
  progressDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase200,
  },
});

interface SyncJob {
  id: number;
  name: string;
  description: string;
  connection_id: number;
  schedule_type: string;
  schedule_config: string;
  is_incremental: boolean;
  is_active: boolean;
  task_limit?: number | null;
  max_runs_per_task?: number | null;
  last_run_at?: string;
  last_run_status?: string;
  last_run_error_message?: string;
  created_at: string;
}

interface Connection {
  id: number;
  name: string;
  org_name?: string;
}

interface JobProgress {
  is_running: boolean;
  tasks_processed?: number;
  total_tasks?: number;
  progress_percent?: number;
  runs_processed?: number;
  results_inserted?: number;
  started_at?: string;
  error_message?: string;
  last_run_status?: string;
}

export default function SyncJobsPage() {
  const styles = useStyles();
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);
  const [editingJob, setEditingJob] = useState<SyncJob | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<SyncJob | null>(null);
  const [jobProgress, setJobProgress] = useState<Map<number, JobProgress>>(new Map());
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ jobName: string; error: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    connection_id: 0,
    schedule_type: 'manual',
    schedule_config: '',
    is_incremental: false,  // Default to FULL sync
    is_active: true,
    task_limit: null as number | null,
    max_runs_per_task: 5 as number | null
  });

  useEffect(() => {
    loadData();
  }, []);

  // Poll for running jobs status
  useEffect(() => {
    const runningJobs = Array.from(jobProgress.entries())
      .filter(([_, progress]) => progress.is_running)
      .map(([jobId, _]) => jobId);

    if (runningJobs.length === 0) return;

    const interval = setInterval(async () => {
      for (const jobId of runningJobs) {
        try {
          const status = await api.getSyncJobStatus(jobId) as JobProgress;
          setJobProgress(prev => new Map(prev).set(jobId, status));

          // If job finished, reload data
          if (!status.is_running) {
            loadData();
          }
        } catch (err) {
          console.error(`Failed to get status for job ${jobId}:`, err);
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobProgress]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [jobsData, connectionsData] = await Promise.all([
        api.getSyncJobs() as Promise<SyncJob[]>,
        api.getConnections() as Promise<Connection[]>
      ]);
      setJobs(jobsData);
      setConnections(connectionsData);

      // Check status of all jobs to detect any that are currently running
      const progressMap = new Map<number, JobProgress>();
      for (const job of jobsData) {
        try {
          const status = await api.getSyncJobStatus(job.id) as JobProgress;
          if (status.is_running) {
            progressMap.set(job.id, status);
          }
        } catch (err) {
          console.error(`Failed to get status for job ${job.id}:`, err);
        }
      }
      if (progressMap.size > 0) {
        setJobProgress(progressMap);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingJob) {
        // For update, only send updateable fields
        const updatePayload = {
          name: formData.name,
          description: formData.description,
          schedule_type: formData.schedule_type,
          schedule_config: formData.schedule_config,
          is_active: formData.is_active,
          is_incremental: formData.is_incremental,
          task_limit: formData.task_limit,
          max_runs_per_task: formData.max_runs_per_task
        };
        console.log('Updating job with payload:', updatePayload);
        await api.updateSyncJob(editingJob.id, updatePayload);
      } else {
        console.log('Creating job with payload:', formData);
        await api.createSyncJob(formData);
      }
      setShowForm(false);
      setEditingJob(null);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(`Error: ${err.message}`);
    }
  }

  async function handleTrigger(id: number, name: string) {
    try {
      setTriggeringId(id);
      await api.triggerSyncJob(id);

      // Set initial running state
      setJobProgress(prev => new Map(prev).set(id, {
        is_running: true,
        tasks_processed: 0,
        total_tasks: 0,
        progress_percent: 0
      }));

      setTriggeringId(null);

      // Start polling for status immediately
      setTimeout(async () => {
        try {
          const status = await api.getSyncJobStatus(id) as JobProgress;
          setJobProgress(prev => new Map(prev).set(id, status));
        } catch (err) {
          console.error('Failed to get initial status:', err);
        }
      }, 1000);
    } catch (err: any) {
      alert(`Error triggering sync job: ${err.message}`);
      setTriggeringId(null);
    }
  }

  async function handleStop(id: number, name: string) {
    if (!confirm(`Stop sync job "${name}"? It will complete the current profile and save a checkpoint for resume.`)) {
      return;
    }
    try {
      await api.stopSyncJob(id);
      alert('Stop requested. The job will stop after completing the current profile.');
    } catch (err: any) {
      alert(`Error stopping sync job: ${err.message}`);
    }
  }

  async function handleResume(id: number, name: string) {
    if (!confirm(`Resume sync job "${name}" from last checkpoint?`)) {
      return;
    }
    try {
      await api.resumeSyncJob(id);
      // Set initial running state
      setJobProgress(prev => new Map(prev).set(id, {
        is_running: true,
        tasks_processed: 0,
        total_tasks: 0,
        progress_percent: 0
      }));
      alert('Resume triggered. The job will continue from where it stopped.');
    } catch (err: any) {
      alert(`Error resuming sync job: ${err.message}`);
    }
  }

  async function handleToggleActive(job: SyncJob) {
    try {
      await api.updateSyncJob(job.id, { is_active: !job.is_active } as any);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleDelete() {
    if (!jobToDelete) return;
    try {
      await api.deleteSyncJob(jobToDelete.id);
      setDeleteDialogOpen(false);
      setJobToDelete(null);
      setShowForm(false);  // Close the form if it was open
      setEditingJob(null); // Clear editing state
      resetForm();         // Reset form data
      loadData();          // Reload jobs list
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  function handleEdit(job: SyncJob) {
    setEditingJob(job);
    setFormData({
      name: job.name,
      description: job.description || '',
      connection_id: job.connection_id,
      schedule_type: job.schedule_type,
      schedule_config: job.schedule_config || '',
      is_incremental: job.is_incremental,
      is_active: job.is_active,
      task_limit: job.task_limit || null,
      max_runs_per_task: job.max_runs_per_task ?? 5
    });
    setShowForm(true);
  }

  function openDeleteDialog(job: SyncJob) {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      connection_id: 0,
      schedule_type: 'manual',
      schedule_config: '',
      is_incremental: false,  // Default to FULL sync
      max_runs_per_task: 5,
      is_active: true,
      task_limit: null
    });
  }

  const schedulePresets = [
    { value: 'manual', label: 'Manual Only' },
    { value: 'hourly', label: 'Every Hour' },
    { value: 'daily', label: 'Daily at Midnight' },
    { value: 'weekly', label: 'Weekly (Sunday)' },
    { value: 'custom', label: 'Custom Cron Expression' }
  ];

  const getStatusBadge = (jobId: number, status?: string, lastRun?: string, jobName?: string, errorMessage?: string) => {
    const progress = jobProgress.get(jobId);

    if (progress?.is_running) {
      return <Badge appearance="filled" color="informative" icon={<Spinner size="extra-tiny" />}>Running</Badge>;
    }

    if (!lastRun) {
      return <Badge appearance="outline">Never Run</Badge>;
    }

    switch (status?.toUpperCase()) {
      case 'SUCCESS':
        return <Badge appearance="filled" color="success">Success</Badge>;
      case 'FAILED':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS }}>
            <Badge appearance="filled" color="danger">Failed</Badge>
            {errorMessage && (
              <Button
                appearance="subtle"
                size="small"
                icon={<ErrorCircle24Regular />}
                title="View error details"
                onClick={() => {
                  setErrorDetails({ jobName: jobName || 'Sync Job', error: errorMessage });
                  setErrorDialogOpen(true);
                }}
                style={{ minWidth: 'auto', padding: '0 4px' }}
              />
            )}
          </div>
        );
      case 'RUNNING':
        return <Badge appearance="filled" color="informative">Running</Badge>;
      default:
        return <Badge appearance="outline">Unknown</Badge>;
    }
  };

  const stats = {
    total: jobs.length,
    active: jobs.filter(j => j.is_active).length,
    lastSuccess: jobs.filter(j => j.last_run_status === 'SUCCESS').length,
    lastFailed: jobs.filter(j => j.last_run_status === 'FAILED').length,
  };

  // Get running jobs
  const runningJobs = Array.from(jobProgress.entries())
    .filter(([_, progress]) => progress.is_running)
    .map(([jobId, progress]) => {
      const job = jobs.find(j => j.id === jobId);
      return { job, progress };
    })
    .filter(item => item.job);

  return (
    <Layout>
      <div className={styles.container}>
        <PageHeader
          title="Sync Jobs"
          subtitle="Schedule and manage data synchronization from IDMC"
          apiHint={{
            step: "Step 2 in API Flow: Sync Jobs",
            description: "After login, sync jobs orchestrate multiple API calls to extract data from IDMC into the local database. They call: Login → Get Profiles → Get Runs → Get Column Stats → Get Patterns/DataTypes/Frequencies"
          }}
          actions={
            <>
              <Button
                appearance="subtle"
                icon={<ArrowSync24Regular />}
                onClick={loadData}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                appearance="primary"
                icon={<Add24Regular />}
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingJob(null);
                  resetForm();
                }}
              >
                {showForm ? 'Cancel' : 'New Sync Job'}
              </Button>
            </>
          }
        />

        {/* Statistics */}
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>Total Jobs</FluentText>
            <FluentText size={600} weight="bold">{stats.total}</FluentText>
          </Card>
          <Card className={styles.statCard}>
            <FluentText size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>Active</FluentText>
            <FluentText size={600} weight="bold" style={{ color: tokens.colorPaletteGreenForeground1 }}>{stats.active}</FluentText>
          </Card>
          <Card className={styles.statCard}>
            <FluentText size={200} style={{ color: tokens.colorPaletteGreenForeground1 }}>Last Success</FluentText>
            <FluentText size={600} weight="bold" style={{ color: tokens.colorPaletteGreenForeground1 }}>{stats.lastSuccess}</FluentText>
          </Card>
          <Card className={styles.statCard}>
            <FluentText size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>Last Failed</FluentText>
            <FluentText size={600} weight="bold" style={{ color: tokens.colorPaletteRedForeground1 }}>{stats.lastFailed}</FluentText>
          </Card>
        </div>

        {/* Form */}
        {showForm && (
          <Card className={styles.card}>
            <div style={{ padding: tokens.spacingVerticalL }}>
              <FluentText size={400} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
                {editingJob ? 'Edit Sync Job' : 'New Sync Job'}
              </FluentText>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <Label required>Job Name</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Daily Full Sync"
                    />
                  </div>

                  <div className={styles.formField}>
                    <Label required>Connection</Label>
                    <Select
                      value={String(formData.connection_id)}
                      onChange={(e, data) => setFormData({ ...formData, connection_id: Number(data.value) })}
                    >
                      <option value="0">Select Connection...</option>
                      {connections.map(conn => (
                        <option key={conn.id} value={String(conn.id)}>
                          {conn.name} {conn.org_name ? `(${conn.org_name})` : ''}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className={`${styles.formField} ${styles.fullWidth}`}>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe this sync job..."
                      rows={3}
                    />
                  </div>

                  <div className={styles.formField}>
                    <Label>Schedule Type</Label>
                    <Select
                      value={formData.schedule_type}
                      onChange={(e, data) => setFormData({ ...formData, schedule_type: data.value })}
                    >
                      {schedulePresets.map(preset => (
                        <option key={preset.value} value={preset.value}>{preset.label}</option>
                      ))}
                    </Select>
                  </div>

                  {formData.schedule_type === 'custom' && (
                    <div className={styles.formField}>
                      <Label>Cron Expression</Label>
                      <Input
                        value={formData.schedule_config}
                        onChange={(e) => setFormData({ ...formData, schedule_config: e.target.value })}
                        placeholder="0 0 * * *"
                      />
                      <FluentText size={200}>Example: "0 0 * * *" = Daily at midnight</FluentText>
                    </div>
                  )}

                  <div className={styles.formField}>
                    <Label htmlFor="task_limit">Task Limit (for testing)</Label>
                    <Select
                      id="task_limit"
                      value={formData.task_limit === null ? 'all' : String(formData.task_limit)}
                      onChange={(e, data) => {
                        const value = data.value === 'all' ? null : parseInt(data.value);
                        console.log('Task limit changed to:', value, 'from dropdown value:', data.value);
                        setFormData({ ...formData, task_limit: value });
                      }}
                    >
                      <option value="all">All Tasks</option>
                      <option value="10">10 Tasks</option>
                      <option value="100">100 Tasks</option>
                      <option value="500">500 Tasks</option>
                    </Select>
                    <FluentText size={200}>
                      Limit number of profiling tasks to import (useful for testing)
                      <span style={{ marginLeft: '8px', color: 'gray' }}>
                        Current: {formData.task_limit === null ? 'All' : formData.task_limit}
                      </span>
                    </FluentText>
                  </div>

                  <div className={styles.formField}>
                    <Label htmlFor="max_runs_per_task">Max Runs per Task</Label>
                    <Select
                      id="max_runs_per_task"
                      value={formData.max_runs_per_task === null ? 'all' : String(formData.max_runs_per_task)}
                      onChange={(e, data) => {
                        const value = data.value === 'all' ? null : parseInt(data.value);
                        setFormData({ ...formData, max_runs_per_task: value });
                      }}
                    >
                      <option value="1">1 Run (Latest Only)</option>
                      <option value="2">2 Runs</option>
                      <option value="3">3 Runs</option>
                      <option value="5">5 Runs (Default)</option>
                      <option value="10">10 Runs</option>
                      <option value="all">All Runs</option>
                    </Select>
                    <FluentText size={200}>
                      Limit number of profiling runs per task
                      <span style={{ marginLeft: '8px', color: 'gray' }}>
                        Current: {formData.max_runs_per_task === null ? 'All' : formData.max_runs_per_task}
                      </span>
                    </FluentText>
                  </div>

                  <div className={styles.formField}>
                    <Switch
                      label="Incremental Sync"
                      checked={formData.is_incremental}
                      onChange={(e, data) => setFormData({ ...formData, is_incremental: data.checked })}
                    />
                    <FluentText size={200}>Only sync new/updated data (delta only)</FluentText>
                  </div>

                  <div className={styles.formField}>
                    <Switch
                      label="Active"
                      checked={formData.is_active}
                      onChange={(e, data) => setFormData({ ...formData, is_active: data.checked })}
                    />
                    <FluentText size={200}>Enable automatic scheduled execution</FluentText>
                  </div>
                </div>

                <div style={{ marginTop: tokens.spacingVerticalL, display: 'flex', gap: tokens.spacingHorizontalM }}>
                  <Button type="submit" appearance="primary">
                    {editingJob ? 'Update Job' : 'Create Job'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowForm(false);
                      setEditingJob(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXXXL }}>
            <Spinner label="Loading sync jobs..." size="large" />
          </div>
        )}

        {/* Error */}
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

        {/* Jobs Table */}
        {!loading && !error && (
          <Card className={styles.card}>
            <div className={styles.tableContainer}>
              <Table size="small" className={styles.table}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell style={{ width: '16%' }}>Name</TableHeaderCell>
                    <TableHeaderCell style={{ width: '13%' }}>Connection</TableHeaderCell>
                    <TableHeaderCell style={{ width: '10%' }}>Schedule</TableHeaderCell>
                    <TableHeaderCell style={{ width: '7%' }}>Type</TableHeaderCell>
                    <TableHeaderCell style={{ width: '7%' }}>Limit</TableHeaderCell>
                    <TableHeaderCell style={{ width: '6%' }}>Active</TableHeaderCell>
                    <TableHeaderCell style={{ width: '11%' }}>Last Run</TableHeaderCell>
                    <TableHeaderCell style={{ width: '20%' }}>Status / Progress</TableHeaderCell>
                    <TableHeaderCell style={{ width: '10%' }}>Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div style={{ textAlign: 'center', padding: tokens.spacingVerticalXXL }}>
                          <FluentText>No sync jobs configured. Click 'New Sync Job' to create one.</FluentText>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobs.map((job) => {
                      const connection = connections.find(c => c.id === job.connection_id);
                      const progress = jobProgress.get(job.id);
                      return (
                        <TableRow key={job.id}>
                          <TableCell>
                            <TableCellLayout>
                              <div>
                                <FluentText weight="semibold">{job.name}</FluentText>
                                {job.description && (
                                  <FluentText size={200} style={{ display: 'block', color: tokens.colorNeutralForeground3 }}>
                                    {job.description}
                                  </FluentText>
                                )}
                              </div>
                            </TableCellLayout>
                          </TableCell>
                          <TableCell>
                            <TableCellLayout>
                              {connection?.name || 'Unknown'}
                            </TableCellLayout>
                          </TableCell>
                          <TableCell>
                            <TableCellLayout media={<Clock24Regular />}>
                              {schedulePresets.find(s => s.value === job.schedule_type)?.label || job.schedule_type}
                            </TableCellLayout>
                          </TableCell>
                          <TableCell>
                            <TableCellLayout>
                              <Badge appearance="outline">
                                {job.is_incremental ? 'Incremental' : 'Full'}
                              </Badge>
                            </TableCellLayout>
                          </TableCell>
                          <TableCell>
                            <TableCellLayout>
                              <FluentText size={200}>
                                {job.task_limit ? `${job.task_limit}` : 'All'}
                              </FluentText>
                            </TableCellLayout>
                          </TableCell>
                          <TableCell>
                            <TableCellLayout>
                              <Switch
                                checked={job.is_active}
                                onChange={() => handleToggleActive(job)}
                              />
                            </TableCellLayout>
                          </TableCell>
                          <TableCell>
                            <TableCellLayout>
                              {job.last_run_at
                                ? new Date(job.last_run_at).toLocaleString()
                                : <FluentText italic>Never</FluentText>}
                            </TableCellLayout>
                          </TableCell>
                          <TableCell>
                            <TableCellLayout>
                              {progress?.is_running ? (
                                <div style={{ minWidth: '200px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, marginBottom: tokens.spacingVerticalXXS }}>
                                    <Spinner size="tiny" />
                                    <FluentText weight="semibold">Running - {progress.progress_percent || 0}%</FluentText>
                                  </div>
                                  <ProgressBar
                                    value={progress.progress_percent || 0}
                                    max={100}
                                    shape="rounded"
                                    thickness="medium"
                                  />
                                  <FluentText size={200} style={{ marginTop: tokens.spacingVerticalXXS, color: tokens.colorNeutralForeground3 }}>
                                    {progress.tasks_processed || 0}/{progress.total_tasks || 0} tasks • {progress.runs_processed || 0} runs • {progress.results_inserted || 0} results
                                  </FluentText>
                                </div>
                              ) : (
                                getStatusBadge(job.id, job.last_run_status, job.last_run_at, job.name, job.last_run_error_message)
                              )}
                            </TableCellLayout>
                          </TableCell>
                          <TableCell>
                            <TableCellLayout>
                              <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
                                {jobProgress.get(job.id)?.is_running ? (
                                  <Button
                                    size="small"
                                    appearance="secondary"
                                    icon={<Stop24Regular />}
                                    onClick={() => handleStop(job.id, job.name)}
                                  >
                                    Stop
                                  </Button>
                                ) : job.last_run_status === 'STOPPED' ? (
                                  <Button
                                    size="small"
                                    appearance="primary"
                                    icon={<PlayCircle24Regular />}
                                    onClick={() => handleResume(job.id, job.name)}
                                  >
                                    Resume
                                  </Button>
                                ) : (
                                  <Button
                                    size="small"
                                    appearance="primary"
                                    icon={<Play24Regular />}
                                    disabled={triggeringId === job.id}
                                    onClick={() => handleTrigger(job.id, job.name)}
                                  >
                                    {triggeringId === job.id ? 'Starting...' : 'Run'}
                                  </Button>
                                )}
                                <Button
                                  size="small"
                                  icon={<Edit24Regular />}
                                  onClick={() => handleEdit(job)}
                                  disabled={jobProgress.get(job.id)?.is_running}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  icon={<Delete24Regular />}
                                  onClick={() => openDeleteDialog(job)}
                                  disabled={jobProgress.get(job.id)?.is_running}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCellLayout>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={(e, data) => setDeleteDialogOpen(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Delete Sync Job</DialogTitle>
              <DialogContent>
                Are you sure you want to delete the sync job "{jobToDelete?.name}"?
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button appearance="primary" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>

        {/* Error Details Dialog */}
        <Dialog open={errorDialogOpen} onOpenChange={(e, data) => setErrorDialogOpen(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
                  <ErrorCircle24Regular style={{ color: tokens.colorPaletteRedForeground1 }} />
                  Sync Job Error
                </div>
              </DialogTitle>
              <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
                  <div>
                    <FluentText weight="semibold">Job:</FluentText>
                    <FluentText> {errorDetails?.jobName}</FluentText>
                  </div>
                  <div>
                    <FluentText weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalXS }}>
                      Error Message:
                    </FluentText>
                    <div
                      style={{
                        padding: tokens.spacingVerticalM,
                        backgroundColor: tokens.colorNeutralBackground2,
                        borderRadius: tokens.borderRadiusMedium,
                        fontFamily: 'monospace',
                        fontSize: tokens.fontSizeBase200,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        border: `1px solid ${tokens.colorPaletteRedBorder1}`,
                      }}
                    >
                      {errorDetails?.error || 'No error details available'}
                    </div>
                  </div>
                </div>
              </DialogContent>
              <DialogActions>
                <Button appearance="primary" onClick={() => setErrorDialogOpen(false)}>
                  Close
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>
    </Layout>
  );
}
