import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
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
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Delete24Regular,
  Edit24Regular,
  CheckmarkCircle24Filled,
  DismissCircle24Filled,
  Warning24Filled,
  ArrowClockwise24Regular,
} from '@fluentui/react-icons';
import Layout from '../src/components/Layout';
import { api } from '../src/lib/api';
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
  },
  connectionRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 1fr auto',
    gap: tokens.spacingHorizontalM,
    alignItems: 'start',
    padding: tokens.spacingVerticalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  connectionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  connectionName: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  connectionDetail: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  connectionActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  statusInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  statusSuccess: {
    color: tokens.colorPaletteGreenForeground1,
  },
  statusFailed: {
    color: tokens.colorPaletteRedForeground1,
  },
  statusPending: {
    color: tokens.colorPaletteYellowForeground1,
  },
});

interface Connection {
  id: number;
  name: string;
  base_url: string;
  org_id?: string;
  org_name?: string;
  profiling_url?: string;
  username: string;
  is_active: boolean;
  last_test_at?: string;
  last_test_status?: string;
  created_at: string;
}

export default function ConnectionsPage() {
  const styles = useStyles();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [connectionToPurge, setConnectionToPurge] = useState<Connection | null>(null);
  const [purgingId, setPurgingId] = useState<number | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    base_url: 'https://dm-us.informaticacloud.com',
    username: '',
    password: ''
  });

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadConnections() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getConnections() as Connection[];
      setConnections(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingConnection) {
        await api.updateConnection(editingConnection.id, formData);
      } else {
        await api.createConnection(formData);
      }
      setShowForm(false);
      setEditingConnection(null);
      setFormData({ name: '', base_url: '', username: '', password: '' });
      loadConnections();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleTest(id: number) {
    try {
      setTestingId(id);
      const result = await api.testConnection(id) as any;

      if (result.success) {
        // Show success message with org info
        const orgInfo = result.org_name
          ? `Connected to ${result.org_name}`
          : 'Connection successful';

        const disconnectedMsg = result.disconnected_connections?.length > 0
          ? `\n\nDisconnected from: ${result.disconnected_connections.join(', ')}`
          : '';

        alert(`✓ ${orgInfo}${disconnectedMsg}\n\nThe profiling task page will now reload to show data for the new organization.`);

        // Reload connections to update UI
        await loadConnections();

        // If we're on the profiling tasks page, reload it
        if (window.location.pathname === '/profiling-tasks') {
          window.location.reload();
        }

        // Broadcast an event so other pages/components can react
        window.dispatchEvent(new CustomEvent('connection-changed', {
          detail: {
            connectionId: id,
            orgId: result.org_id,
            orgName: result.org_name
          }
        }));
      } else {
        // Connection failed - don't reload anything
        alert(`✗ ${result.message}`);
      }
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete() {
    if (!connectionToDelete) return;
    try {
      await api.deleteConnection(connectionToDelete.id);
      loadConnections();
      setDeleteDialogOpen(false);
      setConnectionToDelete(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  function handleEdit(conn: Connection) {
    setEditingConnection(conn);
    setFormData({
      name: conn.name,
      base_url: conn.base_url,
      username: conn.username,
      password: ''
    });
    setShowForm(true);
  }

  function openDeleteDialog(conn: Connection) {
    setConnectionToDelete(conn);
    setDeleteDialogOpen(true);
  }

  function openPurgeDialog(conn: Connection) {
    setConnectionToPurge(conn);
    setPurgeDialogOpen(true);
  }

  async function handleDisconnect(id: number) {
    try {
      setDisconnectingId(id);
      await api.disconnectConnection(id);
      loadConnections();
    } catch (err: any) {
      alert(`Error disconnecting: ${err.message}`);
    } finally {
      setDisconnectingId(null);
    }
  }

  async function handlePurge() {
    if (!connectionToPurge) return;
    try {
      setPurgingId(connectionToPurge.id);
      const result = await api.purgeConnectionData(connectionToPurge.id) as any;
      const rows = result.rows_deleted;
      alert(`✓ Data purged successfully!\n\n${result.message}\n\nRows deleted:\n- dim_dq_asset: ${rows.dim_dq_asset}\n- dim_profiling_task: ${rows.dim_profiling_task}\n- dim_profiling_run: ${rows.dim_profiling_run}\n- dim_column: ${rows.dim_column}\n- fact_profiling_result: ${rows.fact_profiling_result}\n- fact_column_pattern: ${rows.fact_column_pattern}\n- fact_column_datatype: ${rows.fact_column_datatype}\n- fact_column_value_frequency: ${rows.fact_column_value_frequency}\n- fact_api_log: ${rows.fact_api_log}\n- sync_job_runs: ${rows.sync_job_runs}`);
      loadConnections();
      setPurgeDialogOpen(false);
      setConnectionToPurge(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setPurgingId(null);
    }
  }

  const getStatusIcon = (status?: string, lastTest?: string) => {
    if (!lastTest) {
      return <Warning24Filled className={styles.statusPending} />;
    }
    if (status === 'SUCCESS') {
      return <CheckmarkCircle24Filled className={styles.statusSuccess} />;
    }
    if (status === 'DISCONNECTED') {
      return <Warning24Filled className={styles.statusPending} />;
    }
    return <DismissCircle24Filled className={styles.statusFailed} />;
  };

  const getStatusBadge = (status?: string, lastTest?: string) => {
    if (!lastTest) {
      return <Badge appearance="outline" color="warning">Not Tested</Badge>;
    }
    if (status === 'SUCCESS') {
      return <Badge appearance="filled" color="success">Connected</Badge>;
    }
    if (status === 'DISCONNECTED') {
      return <Badge appearance="outline" color="warning">Disconnected</Badge>;
    }
    return <Badge appearance="filled" color="danger">Failed</Badge>;
  };

  return (
    <Layout>
      <div className={styles.container}>
        <PageHeader
          title="IDMC Connections"
          subtitle="Manage your Informatica Data Management Cloud connections"
          apiHint={{
            step: "Step 1 in API Flow: Login & Authentication",
            description: "All IDMC API interactions start here. Login returns a sessionId that's required for all subsequent API calls. Click the info icon (i) to see login API details and how to use the session ID."
          }}
          actions={
            <>
              <APIInfoPopover
                title="Login API"
                endpoint="https://dm-us.informaticacloud.com/ma/api/v2/user/login"
                method="POST"
                description="Authenticate with IDMC and get a session ID. This session ID is used in all subsequent API calls."
                keyFields={[
                  {
                    label: 'Base URL',
                    value: 'https://dm-us.informaticacloud.com',
                    usedIn: 'Used for objects API: {baseUrl}/saas/public/core/v3/objects'
                  },
                  {
                    label: 'Profiling URL',
                    value: 'https://na1-dqprofile.dm-us.informaticacloud.com',
                    usedIn: 'Used for all profiling APIs: {profilingUrl}/profiling-service/api/v1/...'
                  },
                  {
                    label: 'Session ID',
                    value: 'response.sessionId (e.g., jKCN126ee6ggkUCXBmG3Ar...)',
                    usedIn: 'Header IDS-SESSION-ID for profiling APIs, INFA-SESSION-ID for objects API'
                  }
                ]}
                responseExample={{
                  sessionId: "jKCN126ee6ggkUCXBmG3Ar...",
                  currentOrgId: "org123",
                  currentOrgName: "My Organization",
                  userDisplayName: "John Doe"
                }}
                highlightedFields={['sessionId', 'currentOrgId']}
              />
              <Button
                appearance="primary"
                icon={<Add24Regular />}
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingConnection(null);
                  setFormData({ name: '', base_url: 'https://dm-us.informaticacloud.com', username: '', password: '' });
                }}
              >
                {showForm ? 'Cancel' : 'New Connection'}
              </Button>
            </>
          }
        />

        {showForm && (
          <Card className={styles.card}>
            <CardHeader
              header={<FluentText weight="semibold">{editingConnection ? 'Edit Connection' : 'New Connection'}</FluentText>}
            />
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <Label required>Connection Name</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My IDMC Connection"
                  />
                </div>

                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <Label required>Base URL</Label>
                  <Input
                    required
                    type="url"
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="https://dm-us.informaticacloud.com"
                  />
                  <FluentText size={200}>The base IDMC URL (just domain, no paths). Login endpoint: /ma/api/v2/user/login. Profiling URL will be auto-detected.</FluentText>
                </div>

                <div className={styles.formField}>
                  <Label required>Username</Label>
                  <Input
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>

                <div className={styles.formField}>
                  <Label required={!editingConnection}>
                    Password {editingConnection && '(leave blank to keep current)'}
                  </Label>
                  <Input
                    required={!editingConnection}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div style={{ marginTop: tokens.spacingVerticalL, display: 'flex', gap: tokens.spacingHorizontalM }}>
                <Button type="submit" appearance="primary">
                  {editingConnection ? 'Update Connection' : 'Create Connection'}
                </Button>
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditingConnection(null);
                    setFormData({ name: '', base_url: '', username: '', password: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXXL }}>
            <Spinner label="Loading connections..." />
          </div>
        )}

        {error && (
          <Card className={styles.card}>
            <FluentText style={{ color: tokens.colorPaletteRedForeground1 }}>{error}</FluentText>
            <Button onClick={loadConnections} style={{ marginTop: tokens.spacingVerticalM }}>Retry</Button>
          </Card>
        )}

        {!loading && !error && (
          <>
            {connections.length === 0 ? (
              <Card className={styles.card}>
                <div style={{ padding: tokens.spacingVerticalXXL, textAlign: 'center' }}>
                  <FluentText>No connections configured. Click 'New Connection' to add one.</FluentText>
                </div>
              </Card>
            ) : (
              connections.map((conn) => (
                <Card key={conn.id} className={styles.card}>
                  <div className={styles.connectionRow}>
                    {/* Connection Details */}
                    <div className={styles.connectionInfo}>
                      <span className={styles.connectionName}>{conn.name}</span>
                      <span className={styles.connectionDetail}>
                        <strong>Base URL:</strong> {conn.base_url}
                      </span>
                      <span className={styles.connectionDetail}>
                        <strong>Username:</strong> {conn.username}
                      </span>
                    </div>

                    {/* Organization Info */}
                    <div className={styles.connectionInfo}>
                      <span className={styles.connectionDetail}>
                        <strong>Organization:</strong> {conn.org_name || <FluentText italic>Not detected</FluentText>}
                      </span>
                      {conn.org_id && (
                        <span className={styles.connectionDetail}>
                          <strong>Org ID:</strong> {conn.org_id}
                        </span>
                      )}
                      <span className={styles.connectionDetail}>
                        <strong>Profiling URL:</strong> {conn.profiling_url ? 'Detected' : <FluentText italic>Not detected</FluentText>}
                      </span>
                    </div>

                    {/* Status */}
                    <div className={styles.statusInfo}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS }}>
                        {getStatusIcon(conn.last_test_status, conn.last_test_at)}
                        {getStatusBadge(conn.last_test_status, conn.last_test_at)}
                      </div>
                      {conn.last_test_at && (
                        <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                          {new Date(conn.last_test_at).toLocaleString()}
                        </FluentText>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={styles.connectionActions}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS }}>
                        <Button
                          size="small"
                          appearance="primary"
                          disabled={testingId === conn.id}
                          onClick={() => handleTest(conn.id)}
                          style={{ flex: 1 }}
                        >
                          {testingId === conn.id ? 'Connecting...' : 'Connect'}
                        </Button>
                        <APIInfoPopover
                          title="Connect API"
                          endpoint="/identity-service/api/v1/Login"
                          method="POST"
                          description="Authenticates with IDMC and obtains a session token. Then tests access to the profiling API. After login, the system auto-detects the profiling URL (e.g., https://na1-dqprofile.dm-us.informaticacloud.com) and tests access to /profiling-service/api/v1/profile endpoint."
                          parameters={{
                            username: "user@example.com",
                            password: "********"
                          }}
                          responseExample={{
                            sessionId: "abc123...",
                            currentOrgId: "org-uuid-123",
                            currentOrgName: "My Organization",
                            serverUrl: "https://usw5.dm-us.informaticacloud.com/saas",
                            expiresIn: 14400
                          }}
                          highlightedFields={['sessionId', 'currentOrgId', 'currentOrgName', 'serverUrl']}
                        />
                      </div>
                      {conn.last_test_status === 'SUCCESS' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS }}>
                          <Button
                            size="small"
                            onClick={() => handleDisconnect(conn.id)}
                            disabled={disconnectingId === conn.id}
                            style={{ flex: 1 }}
                          >
                            {disconnectingId === conn.id ? 'Disconnecting...' : 'Disconnect'}
                          </Button>
                          <APIInfoPopover
                            title="Disconnect API"
                            endpoint="/connections/{connection_id}/disconnect"
                            method="POST"
                            description="Disconnects from IDMC by clearing the session state. This is a local operation that marks the connection as disconnected. Note: This does not call the IDMC logout API. It only updates the local connection status to 'DISCONNECTED'."
                            responseExample={{
                              message: "Connection disconnected successfully",
                              connection_id: 1
                            }}
                            highlightedFields={['message']}
                          />
                        </div>
                      )}
                      <Button
                        size="small"
                        icon={<Edit24Regular />}
                        onClick={() => handleEdit(conn)}
                        style={{ width: '100%' }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        icon={<ArrowClockwise24Regular />}
                        onClick={() => openPurgeDialog(conn)}
                        disabled={!conn.org_id || purgingId === conn.id}
                        style={{ width: '100%' }}
                      >
                        {purgingId === conn.id ? 'Purging...' : 'Purge Data'}
                      </Button>
                      <Button
                        size="small"
                        icon={<Delete24Regular />}
                        onClick={() => openDeleteDialog(conn)}
                        style={{ width: '100%' }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </>
        )}

        <Dialog open={deleteDialogOpen} onOpenChange={(e, data) => setDeleteDialogOpen(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Delete Connection</DialogTitle>
              <DialogContent>
                Are you sure you want to delete the connection "{connectionToDelete?.name}"?
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

        <Dialog open={purgeDialogOpen} onOpenChange={(e, data) => setPurgeDialogOpen(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Purge Organization Data</DialogTitle>
              <DialogContent>
                <FluentText weight="semibold" style={{ color: tokens.colorPaletteRedForeground1, marginBottom: tokens.spacingVerticalM }}>
                  ⚠️ WARNING: This will delete all data for this organization!
                </FluentText>
                {connectionToPurge && connectionToPurge.org_name && (
                  <FluentText style={{ marginBottom: tokens.spacingVerticalM }}>
                    <strong>Organization:</strong> {connectionToPurge.org_name} ({connectionToPurge.org_id})
                  </FluentText>
                )}
                <FluentText>
                  This will permanently delete:
                </FluentText>
                <ul style={{ marginTop: tokens.spacingVerticalS }}>
                  <li>All profiling tasks for <strong>{connectionToPurge?.org_name || 'this organization'}</strong></li>
                  <li>All profiling runs for this organization</li>
                  <li>All profiling results for this organization</li>
                  <li>All patterns, data types, and value frequencies</li>
                  <li>All rule/mapplet data for this organization</li>
                  <li>All sync job history for this connection</li>
                </ul>
                <FluentText weight="semibold" style={{ color: tokens.colorPaletteRedForeground1, marginTop: tokens.spacingVerticalM }}>
                  This action cannot be undone!
                </FluentText>
                <FluentText style={{ marginTop: tokens.spacingVerticalS, fontStyle: 'italic' }}>
                  Note: Data from other organizations will not be affected.
                </FluentText>
                <FluentText style={{ marginTop: tokens.spacingVerticalS }}>
                  You can re-sync data by running a sync job after purging.
                </FluentText>
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" onClick={() => setPurgeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button appearance="primary" onClick={handlePurge} disabled={purgingId !== null}>
                  {purgingId ? 'Purging...' : 'Purge Organization Data'}
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>
    </Layout>
  );
}
