import React, { useState } from 'react';
import FolderItem from './FolderItem';
import RequestItem from './RequestItem';

export default function CollectionItem({ collection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-xs">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-800 cursor-pointer text-slate-200"
      >
        <span>{expanded ? '▼' : '▶'}</span>
        <span className="font-semibold">{collection?.name || 'Collection'}</span>
      </div>
      {expanded && (
        <div className="pl-4 space-y-1">
          {collection?.folders?.map((f) => <FolderItem key={f.id} folder={f} />)}
          {collection?.requests?.map((r) => <RequestItem key={r.id} request={r} />)}
        </div>
      )}
    </div>
  );
}
