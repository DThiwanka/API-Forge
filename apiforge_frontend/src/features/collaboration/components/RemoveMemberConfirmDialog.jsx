import { memo } from 'react';
import { X, UserMinus, AlertTriangle, Loader2 } from 'lucide-react';

function RemoveMemberConfirmDialogComponent({
  isOpen,
  onClose,
  onConfirm,
  member,
  workspaceName = 'Workspace',
  isPending = false,
}) {
  if (!isOpen || !member) return null;

  const memberName = member.name || member.email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-md bg-[#111319] border border-[#232732] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#232732] bg-[#141720]">
          <div className="flex items-center gap-2 font-semibold text-rose-400">
            <AlertTriangle size={15} />
            <span>Remove Member?</span>
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
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to remove <strong className="text-white">{memberName}</strong> from <strong className="text-white">{workspaceName}</strong>?
          </p>

          <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-lg text-rose-300 text-[11px] leading-relaxed space-y-1">
            <div className="font-semibold text-rose-400">Access Revocation Notice</div>
            <p className="text-slate-400">
              They will immediately lose access to all collections, environments, and canvas workspaces. This action does not delete their APIForge user account.
            </p>
          </div>

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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium transition-colors cursor-pointer shadow-xs"
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              <UserMinus size={12} />
              <span>{isPending ? 'Removing...' : 'Remove Member'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const RemoveMemberConfirmDialog = memo(RemoveMemberConfirmDialogComponent);
export default RemoveMemberConfirmDialog;

