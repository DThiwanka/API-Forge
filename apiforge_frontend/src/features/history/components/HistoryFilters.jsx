import React from 'react';

export default function HistoryFilters() {
  return (
    <div className="flex gap-1">
      <button className="px-2 py-0.5 text-[11px] bg-slate-800 rounded text-slate-300">All</button>
      <button className="px-2 py-0.5 text-[11px] bg-slate-800 rounded text-slate-300">Today</button>
    </div>
  );
}
