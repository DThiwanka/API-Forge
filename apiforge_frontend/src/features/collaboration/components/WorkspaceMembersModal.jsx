import { useState, useMemo } from 'react';
import { Users, Mail, UserPlus, X, Search } from 'lucide-react';
import MemberList from './MemberList';
import InvitationList from './InvitationList';
import InviteMemberDialog from './InviteMemberDialog';
import {
  useMembersQuery,
  useInvitationsQuery,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useRevokeInvitationMutation,
} from '../hooks/useCollaboration';
import { useCurrentUser } from '../../auth/hooks/useAuth';
import { cn } from '../../../utils/cn';

export default function WorkspaceMembersModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceRole = 'MEMBER',
}) {
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invitations'
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const { data: currentUser } = useCurrentUser();
  const canManage = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  // Queries
  const { data: members = [], isLoading: loadingMembers } = useMembersQuery(workspaceId);
  const { data: invitations = [], isLoading: loadingInvitations } = useInvitationsQuery(
    workspaceId,
    canManage
  );

  // Mutations
  const updateRoleMutation = useUpdateMemberRoleMutation(workspaceId);
  const removeMemberMutation = useRemoveMemberMutation(workspaceId);
  const revokeInviteMutation = useRevokeInvitationMutation(workspaceId);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        m.role.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // Filter invitations by search query
  const filteredInvitations = useMemo(() => {
    if (!searchQuery.trim()) return invitations;
    const q = searchQuery.toLowerCase().trim();
    return invitations.filter(
      (i) =>
        i.email.toLowerCase().includes(q) ||
        i.role.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q)
    );
  }, [invitations, searchQuery]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
        <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#111319] border border-[#232732] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#232732] bg-[#141720]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-sky-950/70 border border-sky-600/40 flex items-center justify-center text-sky-400">
                <Users size={15} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 leading-tight">Workspace Collaboration</h2>
                <p className="text-[11px] text-slate-400">
                  Manage workspace members, assign roles, and send email invitations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus size={13} />
                  <span>Invite Member</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1f2430] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Sub-header: Navigation Tabs & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#0e1016] border-b border-[#232732]">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#141720] border border-[#232732]">
              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer',
                  activeTab === 'members'
                    ? 'bg-[#1e2330] text-sky-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <Users size={12} />
                <span>Members ({members.length})</span>
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setActiveTab('invitations')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer',
                    activeTab === 'invitations'
                      ? 'bg-[#1e2330] text-sky-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Mail size={12} />
                  <span>Invitations ({invitations.length})</span>
                </button>
              )}
            </div>

            {/* Filter Search */}
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'members' ? 'Search members...' : 'Search invitations...'}
                className="w-48 sm:w-60 pl-7 pr-3 py-1 bg-[#12151e] border border-[#262c3b] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 min-h-[300px]">
            {activeTab === 'members' ? (
              <MemberList
                members={filteredMembers}
                isLoading={loadingMembers}
                currentUser={currentUser}
                currentUserRole={workspaceRole}
                onUpdateRole={(memberId, newRole) =>
                  updateRoleMutation.mutate({ memberId, role: newRole })
                }
                onRemoveMember={(memberId) => removeMemberMutation.mutate(memberId)}
                isUpdating={updateRoleMutation.isPending}
                isRemoving={removeMemberMutation.isPending}
              />
            ) : (
              <InvitationList
                invitations={filteredInvitations}
                isLoading={loadingInvitations}
                onRevokeInvitation={(invId) => revokeInviteMutation.mutate(invId)}
                isRevoking={revokeInviteMutation.isPending}
              />
            )}
          </div>
        </div>
      </div>

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        workspaceId={workspaceId}
        currentUserRole={workspaceRole}
      />
    </>
  );
}

