/**
 * Workspace Dashboard Utilities
 * 
 * Provides calculation and formatting functions for the developer dashboard
 * using already-loaded TanStack Query cache data and store states.
 */

/**
 * Computes workspace summary metrics from cached query data
 * 
 * @param {object} queryClient - TanStack QueryClient instance
 * @param {string} workspaceId - Current workspace ID
 * @param {Array} collections - Collections array
 * @param {Array} environments - Environments array
 * @returns {{ collectionsCount: number, requestsCount: number, foldersCount: number, environmentsCount: number }}
 */
export function computeWorkspaceMetrics(queryClient, workspaceId, collections = [], environments = []) {
  const collectionsCount = collections ? collections.length : 0;
  const environmentsCount = environments ? environments.length : 0;

  let requestsCount = 0;
  let foldersCount = 0;

  if (queryClient && workspaceId) {
    // Read all cached requests matching ['requests', workspaceId, ...]
    const requestQueries = queryClient.getQueriesData({ queryKey: ['requests', workspaceId] });
    for (const [, reqData] of requestQueries) {
      if (Array.isArray(reqData)) {
        requestsCount += reqData.length;
      }
    }

    // Read all cached folders matching ['folders', workspaceId, ...]
    const folderQueries = queryClient.getQueriesData({ queryKey: ['folders', workspaceId] });
    for (const [, folderData] of folderQueries) {
      if (Array.isArray(folderData)) {
        foldersCount += folderData.length;
      }
    }
  }

  return {
    collectionsCount,
    requestsCount,
    foldersCount,
    environmentsCount,
  };
}

/**
 * Formats last activity from history executions or workspace timestamps.
 * Does not fabricate timestamps if none are available.
 * 
 * @param {Array} historyItems - Execution history items
 * @param {object} workspace - Workspace entity
 * @returns {string|null} Formatted relative time or null
 */
export function formatLastActivity(historyItems = [], workspace = null) {
  let latestTimestamp = null;

  if (Array.isArray(historyItems) && historyItems.length > 0 && historyItems[0]?.createdAt) {
    latestTimestamp = new Date(historyItems[0].createdAt);
  } else if (workspace?.updatedAt) {
    latestTimestamp = new Date(workspace.updatedAt);
  } else if (workspace?.createdAt) {
    latestTimestamp = new Date(workspace.createdAt);
  }

  if (!latestTimestamp || Number.isNaN(latestTimestamp.getTime())) {
    return null;
  }

  const now = new Date();
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - latestTimestamp.getTime()) / 1000));

  if (diffSeconds < 60) {
    return 'Just now';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }
  return latestTimestamp.toLocaleDateString();
}

/**
 * Distinguishes an HTTP response from an execution failure.
 * Ensures HTTP 4xx/5xx responses are labeled as HTTP status codes rather than execution failures.
 * 
 * @param {number|null} status - HTTP status code
 * @param {string|null} errorType - Execution error type if any
 * @returns {{ isExecutionFailure: boolean, label: string, statusText: string, colorClass: string }}
 */
export function formatExecutionStatus(status, errorType = null) {
  if (errorType || status === null || status === undefined || status === 0) {
    const cleanError = errorType
      ? errorType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Execution Failed';

    return {
      isExecutionFailure: true,
      label: cleanError,
      statusText: cleanError,
      colorClass: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
    };
  }

  const statusCode = Number(status);

  if (statusCode >= 200 && statusCode < 300) {
    return {
      isExecutionFailure: false,
      label: `${statusCode}`,
      statusText: `${statusCode} OK`,
      colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
    };
  }

  if (statusCode >= 300 && statusCode < 400) {
    return {
      isExecutionFailure: false,
      label: `${statusCode}`,
      statusText: `${statusCode} Redirect`,
      colorClass: 'text-sky-400 bg-sky-950/40 border-sky-800/50',
    };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return {
      isExecutionFailure: false,
      label: `${statusCode}`,
      statusText: `${statusCode} Client Error`,
      colorClass: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
    };
  }

  if (statusCode >= 500) {
    return {
      isExecutionFailure: false,
      label: `${statusCode}`,
      statusText: `${statusCode} Server Error`,
      colorClass: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
    };
  }

  return {
    isExecutionFailure: false,
    label: `${statusCode}`,
    statusText: `${statusCode}`,
    colorClass: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
  };
}

/**
 * Strips any sensitive properties from an activity item before rendering
 * 
 * @param {object} item 
 * @returns {object} Safe sanitized activity object
 */
export function sanitizeActivityItem(item) {
  if (!item) return null;

  return {
    id: item.id,
    requestId: item.requestId,
    collectionId: item.collectionId,
    workspaceId: item.workspaceId,
    method: item.method,
    url: item.url,
    status: item.status,
    errorType: item.errorType,
    duration: item.duration,
    createdAt: item.createdAt,
    requestName: item.request?.name || 'API Request',
    environmentName: item.environment?.name || null,
  };
}

