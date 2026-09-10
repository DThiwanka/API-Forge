import React from 'react';

export default function ResponseMeta({ time = '120ms', size = '1.2 KB' }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <span>Time: <strong className="text-slate-200">{time}</strong></span>
      <span>Size: <strong className="text-slate-200">{size}</strong></span>
    </div>
  );
}
