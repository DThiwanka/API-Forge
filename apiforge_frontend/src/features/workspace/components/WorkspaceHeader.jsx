import React from 'react';

export default function WorkspaceHeader({ workspaceName = 'My Workspace' }) {
  return (
    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-100">{workspaceName}</h2>
    </div>
  );
}
