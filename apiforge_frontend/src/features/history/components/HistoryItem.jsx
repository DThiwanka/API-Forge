import React from 'react';
import Badge from '../../../components/ui/Badge';

export default function HistoryItem({ item }) {
  return (
    <div className="p-2.5 hover:bg-slate-800/80 cursor-pointer">
      <div className="flex items-center justify-between mb-1">
        <Badge variant={item?.status < 400 ? 'success' : 'danger'}>
          {item?.method || 'GET'}
        </Badge>
        <span className="text-[10px] text-slate-500">{item?.time || 'Just now'}</span>
      </div>
      <p className="text-xs text-slate-300 truncate">{item?.url || 'https://api.example.com'}</p>
    </div>
  );
}
