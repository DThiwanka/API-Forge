import { useState } from 'react';
import { Users, Mail, UserPlus, X, Shield } from 'lucide-react';
import MemberList from './MemberList';
import PendingInvitationList from './PendingInvitationList';
import InviteMemberDialog from './InviteMemberDialog';
import PermissionOverviewModal from './PermissionOverviewModal';
import {
  useMembersQuery,
  useInvitationsQuery,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useRevokeInvitationMutation,
} from '../hooks/useCollaboration';
import { useCurrentUser } from '../../auth/hooks/useAuth';
import { useWorkspaceQuery } from '../../workspace/hooks/useWorkspace';
import { cn } from '../../../utils/cn';

export default function WorkspaceMembersModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceRole = 'MEMBER',
}) {
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invitations'
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  const { data: currentUser } = useCurrentUser();
  const { data: workspace } = useWorkspaceQuery(workspaceId);
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
                <h2 className="text-sm font-bold text-slate-100 leading-tight">
                  {workspace?.name ? `${workspace.name} — Collaboration` : 'Workspace Collaboration'}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Manage workspace members, assign roles, and send email invitations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPermissionsOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#191d27] hover:bg-[#222735] border border-[#2d3446] text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                title="View workspace roles and capabilities"
              >
                <Shield size={13} className="text-sky-400" />
                <span>Role Matrix</span>
              </button>

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

          {/* Sub-header: Navigation Tabs */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-[#0e1016] border-b border-[#232732]">
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
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 min-h-[340px]">
            {activeTab === 'members' ? (
              <MemberList
                members={members}
                isLoading={loadingMembers}
                currentUser={currentUser}
                currentUserRole={workspaceRole}
                workspaceName={workspace?.name || 'Workspace'}
                onUpdateRole={(memberId, newRole) =>
                  updateRoleMutation.mutate({ memberId, role: newRole })
                }
                onRemoveMember={(memberId) => removeMemberMutation.mutate(memberId)}
                isUpdating={updateRoleMutation.isPending}
                isRemoving={removeMemberMutation.isPending}
              />
            ) : (
              <PendingInvitationList
                invitations={invitations}
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

      {/* Roles & Capabilities Matrix */}
      <PermissionOverviewModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
      />
    </>
  );
}
