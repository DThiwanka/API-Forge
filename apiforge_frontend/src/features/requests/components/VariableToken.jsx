import React from 'react';

export default function VariableToken({ name }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-mono">
      {`{{${name}}}`}
    </span>
  );
}
