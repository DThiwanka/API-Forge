import React from 'react';

export default function CanvasToolbar() {
  return (
    <div className="absolute top-4 left-4 z-10 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 flex gap-1 shadow-lg">
      <button className="px-2.5 py-1 text-xs bg-slate-800 text-slate-200 rounded hover:bg-slate-700">+ Node</button>
      <button className="px-2.5 py-1 text-xs bg-slate-800 text-slate-200 rounded hover:bg-slate-700">+ Group</button>
    </div>
  );
}
