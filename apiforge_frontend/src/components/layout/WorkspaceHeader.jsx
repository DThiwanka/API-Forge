import React from 'react';

export default function WorkspaceHeader({ title = 'Workspace' }) {
  return (
    <div className="h-10 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
    </div>
  );
}
