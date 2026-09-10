import React from 'react';

export default function FolderNode({ name = 'Folder' }) {
  return (
    <div className="w-56 bg-slate-900/60 border border-slate-700 rounded-lg p-2.5">
      <h5 className="text-xs font-medium text-slate-300">{name}</h5>
    </div>
  );
}
