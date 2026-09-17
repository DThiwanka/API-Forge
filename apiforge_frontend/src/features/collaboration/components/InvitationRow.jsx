import { memo } from 'react';
import { Mail, Trash2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
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

function InvitationRowComponent({
  invitation,
  onRequestRevoke,
  isRevoking = false,
}) {
  const isPending = invitation.status === 'Pending';
  const statusClass = STATUS_BADGE_CLASSES[invitation.status] || STATUS_BADGE_CLASSES.Pending;

  return (
    <tr className="hover:bg-[#141822]/60 transition-colors border-b border-[#1c202b] last:border-0">
      {/* Email */}
      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200">
        <div className="flex items-center gap-2">
          <Mail size={12} className="text-slate-500 shrink-0" />
          <span className="truncate">{invitation.email}</span>
        </div>
      </td>

      {/* Role */}
      <td className="py-2.5 px-3 font-mono text-[10px] uppercase font-semibold text-slate-300">
        {invitation.role}
      </td>

      {/* Status Badge */}
      <td className="py-2.5 px-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border',
            statusClass
          )}
        >
          {invitation.status === 'Accepted' && <CheckCircle2 size={10} />}
          {invitation.status === 'Revoked' && <XCircle size={10} />}
          {invitation.status === 'Expired' && <AlertCircle size={10} />}
          {invitation.status === 'Pending' && <Clock size={10} />}
          {invitation.status}
        </span>
      </td>

      {/* Expiry */}
      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] hidden sm:table-cell">
        {formatExpiry(invitation.expiresAt)}
      </td>

      {/* Invited By */}
      <td className="py-2.5 px-3 text-slate-400 truncate text-[11px] hidden md:table-cell">
        {invitation.invitedBy?.name || invitation.invitedBy?.email || '—'}
      </td>

      {/* Actions */}
      <td className="py-2.5 px-3 text-right">
        {isPending ? (
          <button
            type="button"
            onClick={() => onRequestRevoke(invitation)}
            disabled={isRevoking}
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
            title="Revoke invitation"
          >
            <Trash2 size={13} />
          </button>
        ) : (
          <span className="text-[10px] text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
}

export const InvitationRow = memo(InvitationRowComponent);
export default InvitationRow;

