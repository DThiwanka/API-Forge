import { memo } from 'react';
import { Eye } from 'lucide-react';
import useCollaborationStore from '../store/collaborationStore';
import { useCurrentUser } from '../../auth/hooks/useAuth';
import { cn } from '../../../utils/cn';

function RequestViewersBadgeComponent({ requestId, className = '' }) {
  const { data: currentUser } = useCurrentUser();
  const workspacePresence = useCollaborationStore((s) => s.workspacePresence);

  if (!requestId) return null;

  // Filter teammates who are currently viewing this request
  const viewers = workspacePresence.filter(
    (p) =>
      p.userId !== currentUser?.id &&
      p.currentResource?.type === 'request' &&
      p.currentResource?.resourceId === requestId
  );

  if (viewers.length === 0) return null;

  const displayText =
    viewers.length === 1
      ? `${viewers[0].displayName || 'Teammate'} is viewing`
      : `${viewers.length} teammates viewing`;

  const tooltipNames = viewers.map((v) => v.displayName || v.email).join(', ');

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-700/40 text-indigo-300 text-[11px] font-medium animate-in fade-in duration-150',
        className
      )}
      title={`Currently viewing: ${tooltipNames}`}
    >
      <Eye size={12} className="text-indigo-400 shrink-0" />
      <span>{displayText}</span>
    </div>
  );
}

export const RequestViewersBadge = memo(RequestViewersBadgeComponent);
export default RequestViewersBadge;

