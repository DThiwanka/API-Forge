import React from 'react';
import ResponseStatus from './ResponseStatus';
import ResponseMeta from './ResponseMeta';
import ResponseTabs from './ResponseTabs';

export default function ResponseInspector() {
  return (
    <div className="flex-1 flex flex-col border-t border-slate-800 overflow-hidden">
      <div className="h-10 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/60">
        <ResponseStatus />
        <ResponseMeta />
      </div>
      <ResponseTabs />
    </div>
  );
}
