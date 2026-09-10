import React from 'react';

export default function StatusBar() {
  return (
    <footer className="h-6 px-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
        <span>Connected</span>
      </div>
      <div>API Forge v1.0.0</div>
    </footer>
  );
}
