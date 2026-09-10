import React from 'react';

export default function ResponseRaw({ raw = '' }) {
  return (
    <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
      {raw || 'Raw response content'}
    </pre>
  );
}
