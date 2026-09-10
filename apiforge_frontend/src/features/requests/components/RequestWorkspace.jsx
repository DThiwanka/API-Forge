import React from 'react';
import RequestHeader from './RequestHeader';
import RequestTabs from './RequestTabs';
import ResponseInspector from '../../response/components/ResponseInspector';

export default function RequestWorkspace() {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 border-r border-slate-800">
      <RequestHeader />
      <div className="flex-1 flex flex-col min-h-0">
        <RequestTabs />
        <ResponseInspector />
      </div>
    </div>
  );
}
