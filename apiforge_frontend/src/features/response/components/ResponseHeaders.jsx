import React from 'react';

export default function ResponseHeaders({ headers = { 'content-type': 'application/json' } }) {
  return (
    <div className="divide-y divide-slate-800 text-xs font-mono">
      {Object.entries(headers).map(([key, val]) => (
        <div key={key} className="py-1.5 flex gap-4">
          <span className="text-slate-400 w-36">{key}:</span>
          <span className="text-slate-200">{val}</span>
        </div>
      ))}
    </div>
  );
}
