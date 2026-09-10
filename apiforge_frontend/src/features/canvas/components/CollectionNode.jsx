import React from 'react';

export default function CollectionNode({ name = 'Collection' }) {
  return (
    <div className="w-60 bg-slate-900/80 border border-indigo-700/60 rounded-lg p-3 shadow-md">
      <h5 className="text-xs font-semibold text-indigo-300">{name}</h5>
    </div>
  );
}
