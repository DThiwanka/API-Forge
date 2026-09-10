import React from 'react';

export default function CommandItem({ title, shortcut, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="px-3 py-2 flex items-center justify-between hover:bg-slate-800 cursor-pointer rounded text-xs text-slate-200"
    >
      <span>{title}</span>
      {shortcut && <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-slate-400">{shortcut}</kbd>}
    </div>
  );
}
