import React from 'react';
import WorkspaceMembers from '../../features/workspace/components/WorkspaceMembers';

export default function Members() {
  return (
    <div className="p-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Workspace Members</h3>
      <WorkspaceMembers />
    </div>
  );
}
