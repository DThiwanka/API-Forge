import React from 'react';
import HistorySearch from './HistorySearch';
import HistoryFilters from './HistoryFilters';
import HistoryItem from './HistoryItem';

export default function HistoryPanel({ items = [] }) {
  return (
    <div className="w-72 border-r border-slate-800 flex flex-col h-full bg-slate-900/60">
      <div className="p-3 border-b border-slate-800 space-y-2">
        <HistorySearch />
        <HistoryFilters />
      </div>
      <div className="flex-1 overflow-auto divide-y divide-slate-800">
        {items.map((item) => (
          <HistoryItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
