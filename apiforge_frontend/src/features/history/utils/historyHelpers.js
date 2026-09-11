/**
 * HTTP Method Badge styling maps
 */
export const METHOD_STYLES = {
  GET: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  POST: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  PUT: 'text-blue-400 bg-blue-950/40 border-blue-800/40',
  PATCH: 'text-purple-400 bg-purple-950/40 border-purple-800/40',
  DELETE: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
  HEAD: 'text-teal-400 bg-teal-950/40 border-teal-800/40',
  OPTIONS: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40',
};

/**
 * Resolve status badge styling and label
 * @param {number|null} status 
 * @param {string|null} errorType 
 * @returns {{ label: string, color: string, isError: boolean }}
 */
export function getStatusBadge(status, errorType) {
  if (errorType || status === null || status === undefined) {
    return {
      label: errorType || 'FAILED',
      color: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
      isError: true,
    };
  }

  if (status >= 200 && status < 300) {
    return {
      label: String(status),
      color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
      isError: false,
    };
  }

  if (status >= 300 && status < 400) {
    return {
      label: String(status),
      color: 'text-sky-400 bg-sky-950/40 border-sky-800/50',
      isError: false,
    };
  }

  if (status >= 400 && status < 500) {
    return {
      label: String(status),
      color: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
      isError: true,
    };
  }

  return {
    label: String(status),
    color: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
    isError: true,
  };
}

/**
 * Format duration in milliseconds or seconds
 * @param {number|null} ms 
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms === null || ms === undefined) return '--';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Format payload size in bytes, KB, or MB
 * @param {number|null} bytes 
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format relative time description
 * @param {string|Date} dateString 
 * @returns {string}
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Group history items into timeline sections (Today, Yesterday, or formatted date)
 * @param {string|Date} dateString 
 * @returns {string}
 */
export function getDateGroupLabel(dateString) {
  if (!dateString) return 'Earlier';
  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default {
  METHOD_STYLES,
  getStatusBadge,
  formatDuration,
  formatBytes,
  formatRelativeTime,
  getDateGroupLabel,
};

