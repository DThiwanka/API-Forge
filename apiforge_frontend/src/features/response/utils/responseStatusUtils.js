export function getStatusCategory(status) {
  if (!status || typeof status !== 'number') return 'unknown';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-error';
  if (status >= 500) return 'server-error';
  return 'unknown';
}

export function getStatusStyles(status) {
  const category = getStatusCategory(status);
  switch (category) {
    case 'success':
      return {
        badge: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
        dot: 'bg-emerald-400',
      };
    case 'redirect':
      return {
        badge: 'text-sky-400 bg-sky-950/60 border-sky-800/60',
        dot: 'bg-sky-400',
      };
    case 'client-error':
      return {
        badge: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
        dot: 'bg-amber-400',
      };
    case 'server-error':
      return {
        badge: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
        dot: 'bg-rose-400',
      };
    default:
      return {
        badge: 'text-slate-300 bg-slate-800 border-slate-700',
        dot: 'bg-slate-400',
      };
  }
}

export default {
  getStatusCategory,
  getStatusStyles,
};

