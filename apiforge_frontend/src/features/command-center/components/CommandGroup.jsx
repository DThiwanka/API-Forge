import React from 'react';
import CommandItem from './CommandItem';

export default function CommandGroup({ title = 'Commands' }) {
  return (
    <div className="p-2">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      <CommandItem title="Create New Request" shortcut="Ctrl+N" />
      <CommandItem title="Send Current Request" shortcut="Ctrl+Enter" />
      <CommandItem title="Toggle Environment" shortcut="Ctrl+E" />
    </div>
  );
}
