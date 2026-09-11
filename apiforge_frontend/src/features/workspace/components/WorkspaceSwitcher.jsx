import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { useWorkspacesQuery } from '../hooks/useWorkspace';
import useResponseStore from '../../response/store/responseStore';
import { cn } from '../../../utils/cn';

const ROLE_COLORS = {
  OWNER: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  ADMIN: 'text-sky-400 bg-sky-950/40 border-sky-800/40',
  MEMBER: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  VIEWER: 'text-slate-400 bg-slate-800/40 border-slate-700/40',
};

export default function WorkspaceSwitcher({ currentWorkspaceId, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const { data: workspaces = [], isLoading } = useWorkspacesQuery();
  const clearResponse = useResponseStore((s) => s.clearResponse);

  const activeWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (workspace) => {
    if (workspace.id !== currentWorkspaceId) {
      clearResponse();
      navigate(`/workspace/${workspace.id}`);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-200 transition-colors focus:outline-none focus:border-sky-500"
        title="Switch Workspace"
      >
        <Layers size={13} className="text-sky-400" />
        <span className="font-semibold truncate max-w-[150px]">
          {isLoading ? 'Loading...' : activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
        </span>
        <ChevronDown size={12} className="text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 bg-[#181b22] border border-[#2b313e] rounded-md shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-[#2b313e] flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Workspaces</span>
            {workspaces.length > 0 && (
              <span className="text-slate-500 text-[10px] lowercase font-normal">
                {workspaces.length} total
              </span>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {workspaces.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 text-center">
                No workspaces available
              </div>
            ) : (
              workspaces.map((ws) => {
                const isActive = ws.id === currentWorkspaceId;
                const roleColor = ROLE_COLORS[ws.role] || ROLE_COLORS.VIEWER;

                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => handleSelect(ws)}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors hover:bg-[#232732]',
                      isActive ? 'bg-[#1e2330] text-sky-400' : 'text-slate-200'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers size={13} className={isActive ? 'text-sky-400' : 'text-slate-500'} />
                      <div className="truncate">
                        <div className="font-medium truncate">{ws.name}</div>
                        {ws.description && (
                          <div className="text-[10px] text-slate-500 truncate">{ws.description}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {ws.role && (
                        <span className={cn('px-1.5 py-0.2 rounded text-[9px] font-mono border font-semibold uppercase', roleColor)}>
                          {ws.role}
                        </span>
                      )}
                      {isActive && <Check size={13} className="text-sky-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

