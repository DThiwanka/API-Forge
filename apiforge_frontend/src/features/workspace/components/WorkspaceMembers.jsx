import React from 'react';
import Avatar from '../../../components/ui/Avatar';

export default function WorkspaceMembers({ members = [] }) {
  return (
    <div className="divide-y divide-slate-800">
      {members.map((member) => (
        <div key={member.id} className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={member.name} />
            <div>
              <p className="text-sm font-medium text-slate-200">{member.name}</p>
              <p className="text-xs text-slate-400">{member.email}</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 capitalize">{member.role}</span>
        </div>
      ))}
    </div>
  );
}
