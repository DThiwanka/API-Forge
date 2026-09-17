import { memo } from 'react';
import { X, Trash2, AlertCircle, Loader2 } from 'lucide-react';

function RevokeInvitationConfirmDialogComponent({
  isOpen,
  onClose,
  onConfirm,
  invitation,
  isPending = false,
}) {
  if (!isOpen || !invitation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-md bg-[#111319] border border-[#232732] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#232732] bg-[#141720]">
          <div className="flex items-center gap-2 font-semibold text-rose-400">
            <AlertCircle size={15} />
            <span>Revoke Invitation?</span>
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
            The invitation sent to <strong className="text-white font-mono">{invitation.email}</strong> with role <strong className="text-white uppercase font-mono">{invitation.role}</strong> will no longer be usable.
          </p>

          <p className="text-[11px] text-slate-400">
            Any link associated with this invitation will be immediately invalidated.
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium transition-colors cursor-pointer shadow-xs"
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              <Trash2 size={12} />
              <span>{isPending ? 'Revoking...' : 'Revoke'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const RevokeInvitationConfirmDialog = memo(RevokeInvitationConfirmDialogComponent);
export default RevokeInvitationConfirmDialog;

