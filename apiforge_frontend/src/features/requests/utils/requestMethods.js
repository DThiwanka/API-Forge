export const METHODS = [
  { method: 'GET', color: 'text-emerald-400', badge: 'bg-emerald-950/40 border-emerald-800/50' },
  { method: 'POST', color: 'text-amber-400', badge: 'bg-amber-950/40 border-amber-800/50' },
  { method: 'PUT', color: 'text-blue-400', badge: 'bg-blue-950/40 border-blue-800/50' },
  { method: 'PATCH', color: 'text-purple-400', badge: 'bg-purple-950/40 border-purple-800/50' },
  { method: 'DELETE', color: 'text-rose-400', badge: 'bg-rose-950/40 border-rose-800/50' },
  { method: 'HEAD', color: 'text-teal-400', badge: 'bg-teal-950/40 border-teal-800/50' },
  { method: 'OPTIONS', color: 'text-indigo-400', badge: 'bg-indigo-950/40 border-indigo-800/50' },
];

export function getMethodConfig(method) {
  const normalized = (method || 'GET').toUpperCase();
  return METHODS.find((m) => m.method === normalized) || METHODS[0];
}

export default METHODS;

