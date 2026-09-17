import { memo } from 'react';
import { X, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

const ROLE_BADGE_CLASSES = {
  OWNER: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  ADMIN: 'text-sky-400 bg-sky-950/40 border-sky-800/40',
  MEMBER: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  VIEWER: 'text-slate-400 bg-slate-800/40 border-slate-700/40',
};

const ROLE_DESCRIPTIONS = {
  OWNER: 'Full workspace control including membership and settings.',
  ADMIN: 'Can manage workspace members, collections, requests, and settings.',
  MEMBER: 'Can create, edit, and organize collections and requests.',
  VIEWER: 'Read-only access to view and execute requests.',
};

function RoleChangeConfirmDialogComponent({
  isOpen,
  onClose,
  onConfirm,
  member,
  targetRole,
  isPending = false,
}) {
  if (!isOpen || !member || !targetRole) return null;

  const memberName = member.name || member.email;
  const currentRole = member.role;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-md bg-[#111319] border border-[#232732] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#232732] bg-[#141720]">
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <ShieldCheck size={15} className="text-sky-400" />
            <span>Change Member Role</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f2430] transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-[#0e1017] border border-[#232732] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Member</span>
              <span className="font-semibold text-slate-100">{memberName}</span>
            </div>

            {/* Old Role → New Role Transition */}
            <div className="flex items-center justify-center gap-3 py-2 px-3 bg-[#131620] border border-[#1e222d] rounded-md">
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border',
                  ROLE_BADGE_CLASSES[currentRole] || ROLE_BADGE_CLASSES.MEMBER
                )}
              >
                {currentRole}
              </span>
              <ArrowRight size={14} className="text-slate-500" />
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border',
                  ROLE_BADGE_CLASSES[targetRole] || ROLE_BADGE_CLASSES.MEMBER
                )}
              >
                {targetRole}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed">
              {ROLE_DESCRIPTIONS[targetRole] || 'This will change what they can do in this workspace.'}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            This will immediately update permissions for <strong className="text-slate-200">{memberName}</strong> in this workspace.
          </p>

          {/* Action buttons */}
          <div className="pt-2 flex justify-end gap-2 border-t border-[#1e222d]">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3 py-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1a1d27] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium transition-colors cursor-pointer shadow-xs"
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              <span>{isPending ? 'Updating Role...' : 'Change Role'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const RoleChangeConfirmDialog = memo(RoleChangeConfirmDialogComponent);
export default RoleChangeConfirmDialog;

