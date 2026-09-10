import React from 'react';
import RequestWorkspace from '../../features/requests/components/RequestWorkspace';
import CollectionTree from '../../features/collections/components/CollectionTree';

export default function WorkspaceHome() {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-64 border-r border-slate-800 bg-slate-900/40">
        <CollectionTree />
      </div>
      <RequestWorkspace />
    </div>
  );
}
