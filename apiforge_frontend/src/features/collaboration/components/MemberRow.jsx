import { memo, useState, useRef, useEffect } from 'react';
import { Crown, MoreVertical, Shield, UserMinus } from 'lucide-react';
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

function MemberRowComponent({
  member,
  currentUser,
  currentUserRole = 'MEMBER',
  ownerCount = 1,
  onRequestRoleChange,
  onRequestRemoveMember,
  isUpdating = false,
  isRemoving = false,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isSelf = member.userId === currentUser?.id;
  const isOwner = member.role === 'OWNER';
  const isLastOwner = isOwner && ownerCount <= 1;

  // Management permission logic
  const canManageRoles = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const canEditRole =
    canManageRoles &&
    !isSelf &&
    (currentUserRole === 'OWNER' || (currentUserRole === 'ADMIN' && !isOwner));

  const canRemoveMember =
    canManageRoles &&
    !isLastOwner &&
    !isSelf &&
    (currentUserRole === 'OWNER' || (currentUserRole === 'ADMIN' && !isOwner));

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const initials = member.name
    ? member.name.charAt(0).toUpperCase()
    : (member.email || 'U').charAt(0).toUpperCase();

  const roleBadgeClass = ROLE_BADGE_CLASSES[member.role] || ROLE_BADGE_CLASSES.MEMBER;

  return (
    <tr className="hover:bg-[#141822]/60 transition-colors border-b border-[#1c202b] last:border-0">
      {/* Avatar, Display Name, Email & You Badge */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-950 to-indigo-900 border border-sky-600/30 flex items-center justify-center text-sky-300 font-bold text-xs shrink-0">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-slate-200 truncate">
              <span className="truncate">{member.name || member.email}</span>
              {isSelf && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950/60 border border-sky-800/40 text-sky-300 font-semibold">
                  You
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

      {/* Role Badge */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border',
              roleBadgeClass
            )}
          >
            {isOwner && <Crown size={10} />}
            {member.role}
          </span>

          {isLastOwner && (
            <span
              className="text-[10px] font-mono text-amber-500/80 bg-amber-950/30 border border-amber-800/30 px-1.5 py-0.2 rounded"
              title="Workspace must have at least one owner"
            >
              Last Owner
            </span>
          )}
        </div>
      </td>

      {/* Joined Date */}
      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] hidden sm:table-cell">
        {formatDate(member.createdAt)}
      </td>

      {/* Actions */}
      <td className="py-2.5 px-3 text-right">
        {canManageRoles && (canEditRole || canRemoveMember) ? (
          <div className="relative inline-block text-left" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              disabled={isUpdating || isRemoving}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1c212d] transition-colors cursor-pointer disabled:opacity-50"
              title="Member actions"
            >
              <MoreVertical size={14} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-[#141720] border border-[#262c3b] rounded-lg shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs text-left">
                {canEditRole && (
                  <>
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Change Role To:
                    </div>

                    {['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].map((targetRole) => {
                      if (targetRole === member.role) return null;
                      if (targetRole === 'OWNER' && currentUserRole !== 'OWNER') return null;

                      return (
                        <button
                          key={targetRole}
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onRequestRoleChange(member, targetRole);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#1e2330] flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Shield size={12} className="text-sky-400" />
                          <span>Make {targetRole}</span>
                        </button>
                      );
                    })}
                  </>
                )}

                {canRemoveMember && (
                  <>
                    {canEditRole && <div className="h-px bg-[#202533] my-1" />}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRequestRemoveMember(member);
                      }}
                      className="w-full px-3 py-1.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <UserMinus size={12} />
                      <span>Remove Member</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : isLastOwner ? (
          <span className="text-[10px] font-mono text-slate-500">Protected</span>
        ) : (
          <span className="text-[10px] text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
}

export const MemberRow = memo(MemberRowComponent);
export default MemberRow;
