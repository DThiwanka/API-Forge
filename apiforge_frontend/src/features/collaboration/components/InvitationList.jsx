import { memo } from 'react';
import { Mail, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

const STATUS_BADGE_CLASSES = {
  Pending: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  Accepted: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  Revoked: 'text-slate-500 bg-slate-900 border-slate-800',
  Expired: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
};

function formatExpiry(dateStr) {
  if (!dateStr) return '—';
  const expiry = new Date(dateStr);
  const now = new Date();
  if (expiry <= now) return 'Expired';

  const diffMs = expiry - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    return `In ${diffHours}h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `In ${diffDays}d`;
}

function InvitationListComponent({
  invitations = [],
  isLoading = false,
  onRevokeInvitation,
  isRevoking = false,
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 size={20} className="animate-spin text-sky-500 mb-2" />
        <span className="text-xs">Loading workspace invitations...</span>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        No invitations have been sent yet.
      </div>
    );
  }

  return (
    <div className="border border-[#232732] rounded-lg overflow-hidden bg-[#111319]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#141721] border-b border-[#232732] text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Invited Email</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Expires</th>
              <th className="py-2.5 px-3">Invited By</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e222d] text-slate-300">
            {invitations.map((inv) => {
              const isPending = inv.status === 'Pending';
              const statusClass = STATUS_BADGE_CLASSES[inv.status] || STATUS_BADGE_CLASSES.Pending;

              return (
                <tr key={inv.id} className="hover:bg-[#141822]/60 transition-colors">
                  {/* Email */}
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-slate-500 shrink-0" />
                      <span className="truncate">{inv.email}</span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-2.5 px-3 font-mono text-[10px] uppercase font-semibold text-slate-300">
                    {inv.role}
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border',
                        statusClass
                      )}
                    >
                      {inv.status === 'Accepted' && <CheckCircle2 size={10} />}
                      {inv.status === 'Revoked' && <XCircle size={10} />}
                      {inv.status === 'Expired' && <AlertCircle size={10} />}
                      {inv.status === 'Pending' && <Clock size={10} />}
                      {inv.status}
                    </span>
                  </td>

                  {/* Expiry */}
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {formatExpiry(inv.expiresAt)}
                  </td>

                  {/* Invited By */}
                  <td className="py-2.5 px-3 text-slate-400 truncate text-[11px]">
                    {inv.invitedBy?.name || inv.invitedBy?.email || '—'}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onRevokeInvitation(inv.id)}
                        disabled={isRevoking}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                        title="Revoke invitation"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const InvitationList = memo(InvitationListComponent);
export default InvitationList;

