import React from 'react';

export default function ResponseBody({ data = { message: 'Success' } }) {
  return (
    <pre className="text-xs font-mono text-slate-200 overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
