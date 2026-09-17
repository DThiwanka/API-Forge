import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import CollectionTree from '../../features/collections/components/CollectionTree';
import MemberList from '../../features/collaboration/components/MemberList';
import PendingInvitationList from '../../features/collaboration/components/PendingInvitationList';
import InviteMemberDialog from '../../features/collaboration/components/InviteMemberDialog';
import PermissionOverviewModal from '../../features/collaboration/components/PermissionOverviewModal';
import {
  useMembersQuery,
  useInvitationsQuery,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useRevokeInvitationMutation,
} from '../../features/collaboration/hooks/useCollaboration';
import { useCurrentUser } from '../../features/auth/hooks/useAuth';
import { useWorkspaceQuery, useWorkspacesQuery } from '../../features/workspace/hooks/useWorkspace';
import useWorkspaceStore from '../../features/workspace/store/workspaceStore';
import { Users, Mail, UserPlus, Shield, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function WorkspaceMembersPage() {
  const { workspaceId: routeWorkspaceId } = useParams();
  const navigate = useNavigate();

  const {
    data: workspaces = [],
    isLoading: loadingWorkspaces,
    error: workspaceError,
  } = useWorkspacesQuery();

  const currentWorkspaceId =
    routeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);

  const { data: currentUser } = useCurrentUser();
  const { data: workspace, isLoading: loadingWorkspace } = useWorkspaceQuery(currentWorkspaceId);

  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  // Collaboration queries & mutations
  const { data: members = [], isLoading: loadingMembers } = useMembersQuery(currentWorkspaceId);
  const { data: invitations = [], isLoading: loadingInvitations } = useInvitationsQuery(
    currentWorkspaceId,
    canManage
  );

  const updateRoleMutation = useUpdateMemberRoleMutation(currentWorkspaceId);
  const removeMemberMutation = useRemoveMemberMutation(currentWorkspaceId);
  const revokeInviteMutation = useRevokeInvitationMutation(currentWorkspaceId);

  // Local state
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invitations'
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  // Sync workspace to store
  useEffect(() => {
    if (currentWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    }
  }, [currentWorkspaceId, setActiveWorkspaceId]);

  // If on /workspace/:workspaceId/members without valid id, redirect to first workspace
  useEffect(() => {
    if (!routeWorkspaceId && workspaces.length > 0) {
      navigate(`/workspace/${workspaces[0].id}/members`, { replace: true });
    }
  }, [routeWorkspaceId, workspaces, navigate]);

  if (workspaceError?.response?.status === 401) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#090a0f] text-slate-400">
          <div className="w-12 h-12 rounded-lg bg-[#111318] border border-[#232732] flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Users size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Sign in to manage workspace members and permissions.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
          >
            Sign In to APIForge
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell workspaceId={currentWorkspaceId}>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left Collections Tree Sidebar */}
        {!sidebarCollapsed && currentWorkspaceId && (
          <CollectionTree workspaceId={currentWorkspaceId} />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0d0f14]">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#232732] bg-[#111318]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-950/70 border border-sky-600/40 flex items-center justify-center text-sky-400 shrink-0">
                <Users size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-100 leading-tight">
                  {workspace?.name ? `${workspace.name} — Members & Collaboration` : 'Workspace Collaboration'}
                </h1>
                <p className="text-xs text-slate-400">
                  Manage members, assign workspace roles, and handle email invitations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPermissionsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181c28] hover:bg-[#202536] border border-[#2d3447] text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                title="View role capability matrix"
              >
                <Shield size={13} className="text-sky-400" />
                <span>Role Permissions</span>
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus size={13} />
                  <span>Invite Member</span>
                </button>
              )}
            </div>
          </div>

          {/* Subheader: Tabs */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-[#0e1016] border-b border-[#232732]">
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

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              {loadingWorkspaces || loadingWorkspace ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-sky-500 mb-2" />
                  <span className="text-xs font-mono">Loading workspace details...</span>
                </div>
              ) : activeTab === 'members' ? (
                <MemberList
                  members={members}
                  isLoading={loadingMembers}
                  currentUser={currentUser}
                  currentUserRole={workspace?.role || 'MEMBER'}
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
      </div>

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        workspaceId={currentWorkspaceId}
        currentUserRole={workspace?.role || 'MEMBER'}
      />

      {/* Role Permissions Modal */}
      <PermissionOverviewModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
      />
    </AppShell>
  );
}

