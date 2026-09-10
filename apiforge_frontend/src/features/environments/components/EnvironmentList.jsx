import React from 'react';

export default function EnvironmentList({ environments = [] }) {
  return (
    <div className="w-48 border-r border-slate-800 pr-3 space-y-1">
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-400">Environments</div>
      {environments.map((env) => (
        <div key={env.id} className="px-2 py-1.5 rounded hover:bg-slate-800 text-xs cursor-pointer text-slate-300">
          {env.name}
        </div>
      ))}
    </div>
  );
}
