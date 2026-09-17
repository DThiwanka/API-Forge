import { memo, useState } from 'react';
import { UserMinus, Crown, Loader2 } from 'lucide-react';
import PermissionSelector from './PermissionSelector';
import { cn } from '../../../utils/cn';

const ROLE_BADGE_CLASSES = {
  OWNER: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  ADMIN: 'text-sky-400 bg-sky-950/40 border-sky-800/40',
  MEMBER: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  VIEWER: 'text-slate-400 bg-slate-800/40 border-slate-700/40',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function MemberListComponent({
  members = [],
  isLoading = false,
  currentUser,
  currentUserRole = 'MEMBER',
  onUpdateRole,
  onRemoveMember,
  isUpdating = false,
  isRemoving = false,
}) {
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const canManageRoles = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  // Check how many owners are present
  const ownerCount = members.filter((m) => m.role === 'OWNER').length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 size={20} className="animate-spin text-sky-500 mb-2" />
        <span className="text-xs">Loading workspace members...</span>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        No members found in this workspace.
      </div>
    );
  }

  return (
    <div className="border border-[#232732] rounded-lg overflow-hidden bg-[#111319]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#141721] border-b border-[#232732] text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Member</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Joined</th>
              {canManageRoles && <th className="py-2.5 px-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e222d] text-slate-300">
            {members.map((member) => {
              const isSelf = member.userId === currentUser?.id;
              const isOwner = member.role === 'OWNER';
              const isLastOwner = isOwner && ownerCount <= 1;

              // Action permission logic
              const canEditThisMember =
                canManageRoles &&
                !isSelf &&
                (currentUserRole === 'OWNER' || (currentUserRole === 'ADMIN' && !isOwner));

              const canRemoveThisMember =
                canManageRoles &&
                !isLastOwner &&
                (currentUserRole === 'OWNER' || (currentUserRole === 'ADMIN' && !isOwner));

              const initials = member.name
                ? member.name.charAt(0).toUpperCase()
                : (member.email || 'U').charAt(0).toUpperCase();

              return (
                <tr key={member.id} className="hover:bg-[#141822]/60 transition-colors">
                  {/* Avatar & User Info */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-950 to-indigo-900 border border-sky-600/30 flex items-center justify-center text-sky-300 font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200 truncate">
                          <span>{member.name || member.email}</span>
                          {isSelf && (
                            <span className="text-[10px] font-mono px-1 rounded bg-[#202636] text-slate-400">
                              you
                            </span>
                          )}
                        </div>
                        {member.name && (
                          <span className="text-[11px] text-slate-500 font-mono truncate">
                            {member.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role Badge or Selector */}
                  <td className="py-2.5 px-3">
                    {canEditThisMember ? (
                      <PermissionSelector
                        value={member.role}
                        onChange={(newRole) => onUpdateRole(member.id, newRole)}
                        disabled={isUpdating}
                        currentUserRole={currentUserRole}
                        className="w-28 text-xs py-1"
                      />
                    ) : (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border',
                          ROLE_BADGE_CLASSES[member.role] || ROLE_BADGE_CLASSES.MEMBER
                        )}
                      >
                        {isOwner && <Crown size={10} />}
                        {member.role}
                      </span>
                    )}
                  </td>

                  {/* Joined Date */}
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {formatDate(member.createdAt)}
                  </td>

                  {/* Action Buttons */}
                  {canManageRoles && (
                    <td className="py-2.5 px-3 text-right">
                      {canRemoveThisMember ? (
                        confirmRemoveId === member.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onRemoveMember(member.id);
                                setConfirmRemoveId(null);
                              }}
                              disabled={isRemoving}
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(null)}
                              className="px-2 py-0.5 rounded bg-[#232836] text-slate-300 hover:text-white text-[11px] transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(member.id)}
                            disabled={isRemoving}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove member from workspace"
                          >
                            <UserMinus size={13} />
                          </button>
                        )
                      ) : isLastOwner ? (
                        <span
                          className="text-[10px] font-mono text-amber-500/80"
                          title="Workspace must have at least one owner"
                        >
                          Last Owner
                        </span>
                      ) : null}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const MemberList = memo(MemberListComponent);
export default MemberList;

