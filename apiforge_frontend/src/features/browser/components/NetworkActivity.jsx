import React from 'react';
import OpenInApiClient from './OpenInApiClient';

export default function NetworkActivity({ requests = [] }) {
  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900/40 flex flex-col">
      <div className="p-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
        Captured Network Requests
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {requests.map((req) => (
          <div key={req.id} className="p-2 bg-slate-900 border border-slate-800 rounded flex justify-between items-center text-xs">
            <span className="truncate text-slate-300">{req.url}</span>
            <OpenInApiClient request={req} />
          </div>
        ))}
      </div>
    </div>
  );
}
