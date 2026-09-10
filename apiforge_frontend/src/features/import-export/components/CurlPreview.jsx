import React from 'react';

export default function CurlPreview({ command = 'curl -X GET https://api.example.com' }) {
  return (
    <pre className="p-3 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-300 overflow-auto">
      {command}
    </pre>
  );
}
