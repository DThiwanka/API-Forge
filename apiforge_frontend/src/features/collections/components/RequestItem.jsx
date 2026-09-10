import React from 'react';
import Badge from '../../../components/ui/Badge';

export default function RequestItem({ request }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800 cursor-pointer text-slate-300 text-xs">
      <Badge variant="default">{request?.method || 'GET'}</Badge>
      <span className="truncate">{request?.name || 'Untitled Request'}</span>
    </div>
  );
}
