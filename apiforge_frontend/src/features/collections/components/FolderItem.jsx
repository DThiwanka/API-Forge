import React, { useState } from 'react';
import RequestItem from './RequestItem';

export default function FolderItem({ folder }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-xs">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 cursor-pointer text-slate-300"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>📁 {folder?.name || 'Folder'}</span>
      </div>
      {expanded && (
        <div className="pl-4 space-y-1">
          {folder?.requests?.map((r) => <RequestItem key={r.id} request={r} />)}
        </div>
      )}
    </div>
  );
}
