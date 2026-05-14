const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(response.status, error || response.statusText);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text() as any;
}

export const api = {
  // Connections
  async getConnections() {
    const response = await fetch(`${API_BASE_URL}/connections`);
    return handleResponse(response);
  },

  async createConnection(data: any) {
    const response = await fetch(`${API_BASE_URL}/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateConnection(id: number, data: any) {
    const response = await fetch(`${API_BASE_URL}/connections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteConnection(id: number) {
    const response = await fetch(`${API_BASE_URL}/connections/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  async testConnection(id: number) {
    const response = await fetch(`${API_BASE_URL}/connections/${id}/test`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  async disconnectConnection(id: number) {
    const response = await fetch(`${API_BASE_URL}/connections/${id}/disconnect`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  async purgeConnectionData(id: number) {
    const response = await fetch(`${API_BASE_URL}/connections/${id}/purge`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Sync Jobs
  async getSyncJobs() {
    const response = await fetch(`${API_BASE_URL}/sync-jobs`);
    return handleResponse(response);
  },

  async createSyncJob(data: any) {
    const response = await fetch(`${API_BASE_URL}/sync-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateSyncJob(id: number, data: any) {
    const response = await fetch(`${API_BASE_URL}/sync-jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteSyncJob(id: number) {
    const response = await fetch(`${API_BASE_URL}/sync-jobs/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  async triggerSyncJob(id: number) {
    const response = await fetch(`${API_BASE_URL}/sync-jobs/${id}/run`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  async getSyncJobStatus(id: number) {
    const response = await fetch(`${API_BASE_URL}/sync-jobs/${id}/status`);
    return handleResponse(response);
  },

  async stopSyncJob(id: number, force: boolean = false) {
    const url = force
      ? `${API_BASE_URL}/sync-jobs/${id}/stop?force=true`
      : `${API_BASE_URL}/sync-jobs/${id}/stop`;
    const response = await fetch(url, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  async resumeSyncJob(id: number) {
    const response = await fetch(`${API_BASE_URL}/sync-jobs/${id}/resume`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Profiling Tasks
  async getProfilingTasks(filters?: any) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/profiling/tasks?${params}`);
    return handleResponse(response);
  },

  async getProfilingTaskSummary(filters?: any) {
    const params = filters ? new URLSearchParams(filters) : '';
    const response = await fetch(`${API_BASE_URL}/profiling/tasks-summary${params ? '?' + params : ''}`);
    return handleResponse(response);
  },

  async getProfilingTaskRuns(taskId: string) {
    const response = await fetch(`${API_BASE_URL}/profiling/runs?task_id=${taskId}`);
    return handleResponse(response);
  },

  async getDashboardStats() {
    const response = await fetch(`${API_BASE_URL}/profiling/dashboard/stats`);
    return handleResponse(response);
  },

  // Reports
  async getProfilingResults(filters: any) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/profiling/results?${params}`);
    return handleResponse(response);
  },

  // Enhanced Profiling Data
  async getColumnPatterns(runId: string) {
    const response = await fetch(`${API_BASE_URL}/profiling/patterns?run_id=${runId}`);
    return handleResponse(response);
  },

  async getColumnDataTypes(runId: string) {
    const response = await fetch(`${API_BASE_URL}/profiling/datatypes?run_id=${runId}`);
    return handleResponse(response);
  },

  async getColumnValueFrequencies(runId: string) {
    const response = await fetch(`${API_BASE_URL}/profiling/value-frequencies?run_id=${runId}`);
    return handleResponse(response);
  },

  async getStatisticsTrends(filters: any) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/statistics/trends?${params}`);
    return handleResponse(response);
  },

  async getStatisticsDrift(filters: any) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/statistics/drift?${params}`);
    return handleResponse(response);
  },
};
