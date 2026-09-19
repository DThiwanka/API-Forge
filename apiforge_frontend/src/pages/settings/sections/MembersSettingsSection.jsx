import { Link } from 'react-router-dom';
import { useMembersQuery, useInvitationsQuery } from '../../../features/collaboration/hooks/useCollaboration';
import { useWorkspaceQuery } from '../../../features/workspace/hooks/useWorkspace';
import { Users, ArrowRight, ShieldCheck } from 'lucide-react';

export default function MembersSettingsSection({ workspaceId }) {
  const { data: workspace } = useWorkspaceQuery(workspaceId);
  const { data: members = [], isLoading: loadingMembers } = useMembersQuery(workspaceId);
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const { data: invitations = [] } = useInvitationsQuery(workspaceId, canManage);

  const pendingCount = invitations.filter((i) => i.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-100 tracking-wide">Members & Collaboration</h2>
        <p className="text-xs text-slate-400 mt-1">
          Review workspace membership, roles, permissions, and pending collaborator invitations.
        </p>
      </div>

      {/* Membership Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-[#14171f] border border-[#232732]">
          <div className="text-[11px] text-slate-400">Your Current Role</div>
          <div className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="uppercase tracking-wider">{workspace?.role || 'VIEWER'}</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#14171f] border border-[#232732]">
          <div className="text-[11px] text-slate-400">Active Members</div>
          <div className="text-xl font-bold text-slate-100 mt-1">
            {loadingMembers ? '...' : members.length}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#14171f] border border-[#232732]">
          <div className="text-[11px] text-slate-400">Pending Invitations</div>
          <div className="text-xl font-bold text-slate-100 mt-1">
            {pendingCount}
          </div>
        </div>
      </div>

      {/* Direct Management Link */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-200">Workspace Member Manager</h3>
          </div>
          <p className="text-[11px] text-slate-400 max-w-lg">
            Invite colleagues, modify member access roles, and revoke collaborator access.
          </p>
        </div>

        <Link
          to={`/workspace/${workspaceId}/members`}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0"
        >
          <span>Manage Members</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
