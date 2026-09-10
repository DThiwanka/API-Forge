import React from 'react';

export default function VariableRow({ variable }) {
  return (
    <div className="grid grid-cols-3 px-3 py-2 text-xs text-slate-300 font-mono">
      <span>{variable?.key || ''}</span>
      <span>{variable?.initialValue || ''}</span>
      <span>{variable?.currentValue || ''}</span>
    </div>
  );
}
