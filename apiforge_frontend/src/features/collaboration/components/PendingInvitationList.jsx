import { memo, useState, useMemo } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import InvitationRow from './InvitationRow';
import RevokeInvitationConfirmDialog from './RevokeInvitationConfirmDialog';

function PendingInvitationListComponent({
  invitations = [],
  isLoading = false,
  onRevokeInvitation,
  isRevoking = false,
}) {
  const [selectedInviteToRevoke, setSelectedInviteToRevoke] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'ACCEPTED'

  const counts = useMemo(() => {
    return {
      all: invitations.length,
      pending: invitations.filter((i) => i.status === 'Pending').length,
      expired: invitations.filter((i) => i.status === 'Expired').length,
      accepted: invitations.filter((i) => i.status === 'Accepted').length,
      revoked: invitations.filter((i) => i.status === 'Revoked').length,
    };
  }, [invitations]);

  const filteredInvitations = useMemo(() => {
    if (statusFilter === 'ALL') return invitations;
    return invitations.filter((i) => i.status.toUpperCase() === statusFilter);
  }, [invitations, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 size={22} className="animate-spin text-sky-500 mb-2.5" />
        <span className="text-xs font-mono">Loading invitations...</span>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-[#232732] rounded-xl bg-[#111319]">
        <div className="w-10 h-10 rounded-full bg-[#181b26] border border-[#262c3d] flex items-center justify-center text-slate-500 mb-3">
          <Mail size={18} />
        </div>
        <h4 className="text-xs font-semibold text-slate-300 mb-1">No invitations sent yet</h4>
        <p className="text-[11px] text-slate-500 max-w-xs">
          Invite teammates by email to grant them access to this workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sub-filters for invitations */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL', label: 'All', count: counts.all },
          { id: 'PENDING', label: 'Pending', count: counts.pending },
          { id: 'EXPIRED', label: 'Expired', count: counts.expired },
          { id: 'ACCEPTED', label: 'Accepted', count: counts.accepted },
          { id: 'REVOKED', label: 'Revoked', count: counts.revoked },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === tab.id
                ? 'bg-[#1e2330] text-sky-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141720]'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#141720] text-slate-400">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {filteredInvitations.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs border border-[#232732] rounded-lg bg-[#111319]">
          No {statusFilter.toLowerCase()} invitations found.
        </div>
      ) : (
        <div className="border border-[#232732] rounded-lg overflow-hidden bg-[#111319]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#141721] border-b border-[#232732] text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Invited Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Expires</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Invited By</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222d] text-slate-300">
                {filteredInvitations.map((inv) => (
                  <InvitationRow
                    key={inv.id}
                    invitation={inv}
                    onRequestRevoke={(i) => setSelectedInviteToRevoke(i)}
                    isRevoking={isRevoking}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revoke confirmation dialog */}
      <RevokeInvitationConfirmDialog
        isOpen={Boolean(selectedInviteToRevoke)}
        onClose={() => setSelectedInviteToRevoke(null)}
        onConfirm={() => {
          if (selectedInviteToRevoke) {
            onRevokeInvitation(selectedInviteToRevoke.id);
            setSelectedInviteToRevoke(null);
          }
        }}
        invitation={selectedInviteToRevoke}
        isPending={isRevoking}
      />
    </div>
  );
}

export const PendingInvitationList = memo(PendingInvitationListComponent);
export default PendingInvitationList;

