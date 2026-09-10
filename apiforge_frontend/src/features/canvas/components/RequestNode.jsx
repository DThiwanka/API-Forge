import React from 'react';
import Badge from '../../../components/ui/Badge';

export default function RequestNode({ method = 'GET', name = 'Request', url = '' }) {
  return (
    <div className="w-64 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="info">{method}</Badge>
        <span className="text-xs font-semibold text-slate-200 truncate">{name}</span>
      </div>
      <div className="text-xs text-slate-400 truncate">{url || 'https://api.example.com'}</div>
    </div>
  );
}
