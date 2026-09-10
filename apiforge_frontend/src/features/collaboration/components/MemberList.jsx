import React from 'react';
import Avatar from '../../../components/ui/Avatar';

export default function MemberList({ members = [] }) {
  return (
    <div className="divide-y divide-slate-800">
      {members.map((m) => (
        <div key={m.id} className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar name={m.name} size="sm" />
            <span className="text-xs text-slate-200">{m.name}</span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase">{m.role}</span>
        </div>
      ))}
    </div>
  );
}
