import React from 'react';
import VariableRow from './VariableRow';

export default function VariableTable({ variables = [] }) {
  return (
    <div className="flex-1">
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-3 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-800">
          <span>Variable</span>
          <span>Initial Value</span>
          <span>Current Value</span>
        </div>
        <div className="divide-y divide-slate-800">
          {variables.map((v, i) => (
            <VariableRow key={i} variable={v} />
          ))}
        </div>
      </div>
    </div>
  );
}
