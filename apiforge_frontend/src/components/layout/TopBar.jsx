import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Search, LogOut, ChevronDown, Keyboard, User, Briefcase, Settings } from 'lucide-react';
import WorkspaceSwitcher from '../../features/workspace/components/WorkspaceSwitcher';
import EnvironmentSwitcher from '../../features/environments/components/EnvironmentSwitcher';
import { useCurrentUser, useLogoutMutation } from '../../features/auth/hooks/useAuth';
import useCommandCenterStore from '../../features/command-center/store/commandCenterStore';
import useShortcutStore from '../../features/shortcuts/store/shortcutStore.js';
import { isMac } from '../../features/shortcuts/utils/shortcutUtils.js';
import useCollaborationStore from '../../features/collaboration/store/collaborationStore.js';
import { cn } from '../../utils/cn';

export default function TopBar({ workspaceId }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const isMacOS = useMemo(() => isMac(), []);
  const navigate = useNavigate();

  const { data: currentUser } = useCurrentUser();
  const logoutMutation = useLogoutMutation();
  const openShortcutsHelp = useShortcutStore((s) => s.openHelpModal);
  const connectionStatus = useCollaborationStore((s) => s.connectionStatus);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logoutMutation.mutate();
  };

  const handleNavigate = (path) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="h-11 bg-[#111318] border-b border-[#232732] px-3 flex items-center justify-between select-none">
      {/* Left Branding & Workspace Switcher */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-slate-100 hover:text-sky-400 transition-colors"
        >
          <div className="w-6 h-6 rounded bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400 shadow-sm">
            <Terminal size={14} />
          </div>
          <span className="font-semibold text-xs tracking-wider uppercase">APIForge</span>
        </Link>

        <div className="h-4 w-px bg-[#232732]" />

        <WorkspaceSwitcher currentWorkspaceId={workspaceId} />
      </div>

      {/* Center Command Center / Search Affordance */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
        <button
          type="button"
          onClick={() => useCommandCenterStore.getState().open()}
          aria-label={`Search requests or commands (${isMacOS ? 'Cmd+K' : 'Ctrl+K'})`}
          className="w-full flex items-center justify-between px-2.5 py-1 bg-[#14171f] hover:bg-[#181b22] border border-[#2b313e] hover:border-slate-600 rounded text-xs text-slate-400 transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2">
            <Search size={12} className="text-slate-500 group-hover:text-slate-300" />
            <span className="text-[11px] text-slate-400 group-hover:text-slate-300">
              Search requests or commands...
            </span>
          </div>
          <kbd className="px-1.5 py-0.2 rounded bg-[#1c212c] border border-[#2b313e] font-mono text-[10px] text-slate-400">
            {isMacOS ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>
      </div>

      {/* Right Controls: Mobile Search, Realtime Status, Environment, User & Sign Out */}
      <div className="flex items-center gap-2">
        {/* Mobile / Tablet search button */}
        <button
          type="button"
          onClick={() => useCommandCenterStore.getState().open()}
          className="flex md:hidden p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#181b22] transition-colors cursor-pointer"
          aria-label={`Open Command Center (${isMacOS ? 'Cmd+K' : 'Ctrl+K'})`}
          title={`Search requests and commands (${isMacOS ? 'Cmd+K' : 'Ctrl+K'})`}
        >
          <Search size={14} />
        </button>

        {/* Subtle Realtime Connection State */}
        {workspaceId && (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#14171f] border border-[#232732] text-[10px] font-mono select-none"
            title={`Realtime Status: ${connectionStatus}`}
            aria-label={`Realtime Connection: ${connectionStatus}`}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                connectionStatus === 'connected' && 'bg-emerald-400',
                connectionStatus === 'connecting' && 'bg-sky-400 animate-pulse',
                connectionStatus === 'reconnecting' && 'bg-amber-400 animate-pulse',
                connectionStatus === 'offline' && 'bg-slate-500'
              )}
            />
            <span className="text-slate-400 capitalize">
              {connectionStatus === 'connected' ? 'Live' : connectionStatus}
            </span>
          </div>
        )}

        {workspaceId && <EnvironmentSwitcher workspaceId={workspaceId} />}

        {currentUser ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              aria-label="User account menu"
              className="flex items-center gap-1.5 p-1 rounded hover:bg-[#181b22] border border-transparent hover:border-[#2b313e] text-xs text-slate-200 transition-colors focus:outline-none"
            >
              <div className="w-6 h-6 rounded-full bg-sky-900 border border-sky-600/40 flex items-center justify-center text-sky-300 font-bold text-[10px]">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div
                role="menu"
                aria-label="User menu"
                className="absolute right-0 mt-1 w-52 bg-[#181b22] border border-[#2b313e] rounded-md shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs"
              >
                <div className="px-3 py-2 border-b border-[#232732]">
                  <div className="font-semibold text-slate-100 truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                </div>

                <div className="py-1 border-b border-[#232732]" role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(workspaceId ? `/workspace/${workspaceId}/settings/account` : '/settings/account')}
                    className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-slate-100 hover:bg-[#1f2433] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User size={13} className="text-slate-400" />
                    <span>Account Settings</span>
                  </button>

                  {workspaceId && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavigate(`/workspace/${workspaceId}/settings/workspace`)}
                      className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-slate-100 hover:bg-[#1f2433] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Briefcase size={13} className="text-slate-400" />
                      <span>Workspace Settings</span>
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(workspaceId ? `/workspace/${workspaceId}/settings/appearance` : '/settings/appearance')}
                    className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-slate-100 hover:bg-[#1f2433] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Settings size={13} className="text-slate-400" />
                    <span>Preferences</span>
                  </button>
                </div>

                <div className="py-1 border-b border-[#232732]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openShortcutsHelp();
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-slate-100 hover:bg-[#1f2433] flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Keyboard size={13} className="text-slate-400" />
                      <span>Keyboard Shortcuts</span>
                    </div>
                    <kbd className="px-1 py-0.2 rounded bg-[#13161f] border border-[#2b313e] font-mono text-[10px] text-slate-400">
                      ?
                    </kbd>
                  </button>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="w-full px-3 py-1.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>{logoutMutation.isPending ? 'Signing out...' : 'Sign out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-2.5 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
