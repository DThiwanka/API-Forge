import { memo, useState, useMemo } from 'react';
import { Loader2, Users, SearchX } from 'lucide-react';
import MemberRow from './MemberRow';
import MemberFilters from './MemberFilters';
import RoleChangeConfirmDialog from './RoleChangeConfirmDialog';
import RemoveMemberConfirmDialog from './RemoveMemberConfirmDialog';

function MemberListComponent({
  members = [],
  isLoading = false,
  currentUser,
  currentUserRole = 'MEMBER',
  workspaceName = 'Workspace',
  onUpdateRole,
  onRemoveMember,
  isUpdating = false,
  isRemoving = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [roleChangeTarget, setRoleChangeTarget] = useState(null); // { member, targetRole }
  const [removeTarget, setRemoveTarget] = useState(null); // member

  const ownerCount = useMemo(
    () => members.filter((m) => m.role === 'OWNER').length,
    [members]
  );

  const counts = useMemo(() => ({
    all: members.length,
    owner: members.filter((m) => m.role === 'OWNER').length,
    admin: members.filter((m) => m.role === 'ADMIN').length,
    member: members.filter((m) => m.role === 'MEMBER').length,
    viewer: members.filter((m) => m.role === 'VIEWER').length,
  }), [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selectedRoleFilter !== 'ALL' && m.role !== selectedRoleFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = m.name && m.name.toLowerCase().includes(q);
        const emailMatch = m.email && m.email.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) {
          return false;
        }
      }
      return true;
    });
  }, [members, selectedRoleFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 size={22} className="animate-spin text-sky-500 mb-2.5" />
        <span className="text-xs font-mono">Loading workspace members...</span>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-[#232732] rounded-xl bg-[#111319]">
        <div className="w-10 h-10 rounded-full bg-[#181b26] border border-[#262c3d] flex items-center justify-center text-slate-500 mb-3">
          <Users size={18} />
        </div>
        <h4 className="text-xs font-semibold text-slate-300 mb-1">No members found</h4>
        <p className="text-[11px] text-slate-500 max-w-xs">
          This workspace does not currently have any members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      <MemberFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRoleFilter={selectedRoleFilter}
        onRoleFilterChange={setSelectedRoleFilter}
        counts={counts}
      />

      {/* Filtered Empty State */}
      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border border-[#232732] rounded-lg bg-[#111319] space-y-2">
          <SearchX size={20} className="text-slate-500" />
          <div className="text-xs text-slate-400">
            No members match your current filter{searchQuery ? ` ("${searchQuery}")` : ''}.
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedRoleFilter('ALL');
            }}
            className="text-[11px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="border border-[#232732] rounded-lg overflow-hidden bg-[#111319]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#141721] border-b border-[#232732] text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Joined</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222d] text-slate-300">
                {filteredMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    currentUser={currentUser}
                    currentUserRole={currentUserRole}
                    ownerCount={ownerCount}
                    onRequestRoleChange={(m, targetRole) =>
                      setRoleChangeTarget({ member: m, targetRole })
                    }
                    onRequestRemoveMember={(m) => setRemoveTarget(m)}
                    isUpdating={isUpdating}
                    isRemoving={isRemoving}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Dialog */}
      <RoleChangeConfirmDialog
        isOpen={Boolean(roleChangeTarget)}
        onClose={() => setRoleChangeTarget(null)}
        onConfirm={() => {
          if (roleChangeTarget) {
            onUpdateRole(roleChangeTarget.member.id, roleChangeTarget.targetRole);
            setRoleChangeTarget(null);
          }
        }}
        member={roleChangeTarget?.member}
        targetRole={roleChangeTarget?.targetRole}
        isPending={isUpdating}
      />

      {/* Remove Member Confirmation Dialog */}
      <RemoveMemberConfirmDialog
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) {
            onRemoveMember(removeTarget.id);
            setRemoveTarget(null);
          }
        }}
        member={removeTarget}
        workspaceName={workspaceName}
        isPending={isRemoving}
      />
    </div>
  );
}

export const MemberList = memo(MemberListComponent);
export default MemberList;
