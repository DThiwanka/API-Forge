import { memo, useState, useRef, useEffect } from 'react';
import { Users, Wifi, WifiOff } from 'lucide-react';
import useCollaborationStore from '../store/collaborationStore';
import { useCurrentUser } from '../../auth/hooks/useAuth';
import { cn } from '../../../utils/cn';

function formatResourceLocation(resource) {
  if (!resource) return 'Active in workspace';
  if (resource.type === 'request') {
    return resource.resourceName ? `Viewing: ${resource.resourceName}` : 'Viewing a request';
  }
  if (resource.type === 'canvas') return 'Exploring Canvas';
  if (resource.type === 'browser') return 'In Browser Space';
  if (resource.type === 'collection') return 'Browsing collections';
  return 'Active in workspace';
}

function WorkspacePresenceIndicatorComponent({ onOpenMembers, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  const { data: currentUser } = useCurrentUser();
  const connectionStatus = useCollaborationStore((s) => s.connectionStatus);
  const workspacePresence = useCollaborationStore((s) => s.workspacePresence);

  // Close popover on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeCount = workspacePresence.length;

  const statusColor =
    connectionStatus === 'connected'
      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
      : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
      ? 'bg-amber-500 animate-pulse'
      : 'bg-slate-500';

  return (
    <div className={cn('relative inline-flex items-center', className)} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#181b22] hover:bg-[#202534] border border-[#2b313e] text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer select-none"
        title={`Realtime Status: ${connectionStatus}. ${activeCount} teammate${activeCount === 1 ? '' : 's'} active`}
      >
        {/* Connection status dot */}
        <span className={cn('w-2 h-2 rounded-full shrink-0', statusColor)} />

        {/* Stacked avatars or presence count */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <Users size={12} className="text-slate-400" />
          <span>{activeCount > 0 ? `${activeCount} online` : connectionStatus}</span>
        </div>
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#12151e] border border-[#262c3b] rounded-lg shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
          {/* Header */}
          <div className="px-3 py-1.5 border-b border-[#1e2330] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              {connectionStatus === 'connected' ? (
                <Wifi size={13} className="text-emerald-400" />
              ) : (
                <WifiOff size={13} className="text-amber-400" />
              )}
              <span className="capitalize">{connectionStatus}</span>
            </div>
            <span className="font-mono text-slate-400 text-[10px]">
              {activeCount} active
            </span>
          </div>

          {/* Member presence list */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[#1b1f2b] p-1">
            {workspacePresence.length === 0 ? (
              <div className="py-4 text-center text-slate-500 text-[11px]">
                No teammates currently active.
              </div>
            ) : (
              workspacePresence.map((member) => {
                const isSelf = member.userId === currentUser?.id;
                const initials = (member.displayName || member.email || 'U')
                  .charAt(0)
                  .toUpperCase();

                return (
                  <div key={member.userId} className="p-2 hover:bg-[#181c28] rounded flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-900 to-indigo-900 border border-sky-600/30 flex items-center justify-center text-[10px] font-bold text-sky-300 shrink-0">
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1 leading-tight">
                        <span className="font-medium text-slate-200 truncate">
                          {member.displayName || member.email}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] font-mono px-1 rounded bg-[#202636] text-sky-300">
                            you
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">
                        {formatResourceLocation(member.currentResource)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer action */}
          {onOpenMembers && (
            <div className="px-3 pt-2 border-t border-[#1e2330]">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenMembers();
                }}
                className="w-full py-1 rounded bg-[#181c28] hover:bg-[#202638] text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors text-center cursor-pointer"
              >
                Manage Members & Invitations
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const WorkspacePresenceIndicator = memo(WorkspacePresenceIndicatorComponent);
export default WorkspacePresenceIndicator;

