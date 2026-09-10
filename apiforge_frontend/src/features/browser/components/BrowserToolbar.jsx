import React from 'react';

export default function BrowserToolbar() {
  return (
    <div className="h-9 px-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
      <button className="text-slate-400 hover:text-white text-xs">◀</button>
      <button className="text-slate-400 hover:text-white text-xs">▶</button>
      <button className="text-slate-400 hover:text-white text-xs">↻</button>
    </div>
  );
}
