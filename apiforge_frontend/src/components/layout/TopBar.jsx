import React from 'react';
import WorkspaceSwitcher from '../../features/workspace/components/WorkspaceSwitcher';

export default function TopBar() {
  return (
    <header className="h-12 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="font-bold text-base tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          API Forge
        </span>
        <WorkspaceSwitcher />
      </div>
    </header>
  );
}
