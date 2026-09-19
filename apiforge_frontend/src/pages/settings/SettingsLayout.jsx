import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import SettingsSidebar, { SETTINGS_SECTIONS } from './SettingsSidebar';
import AccountSettings from './sections/AccountSettings';
import WorkspaceSettings from './sections/WorkspaceSettings';
import AppearanceSettings from './sections/AppearanceSettings';
import DeveloperSettings from './sections/DeveloperSettings';
import EnvironmentsSettingsSection from './sections/EnvironmentsSettingsSection';
import MembersSettingsSection from './sections/MembersSettingsSection';
import SecuritySettingsSection from './sections/SecuritySettingsSection';
import ShortcutsSettingsSection from './sections/ShortcutsSettingsSection';
import { useWorkspacesQuery } from '../../features/workspace/hooks/useWorkspace';
import useWorkspaceStore from '../../features/workspace/store/workspaceStore';
import { Settings as SettingsIcon, ChevronRight } from 'lucide-react';

export default function SettingsLayout() {
  const { workspaceId: routeWorkspaceId, section: routeSection } = useParams();
  const navigate = useNavigate();

  const { data: workspaces = [] } = useWorkspacesQuery();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);

  // Determine effective workspaceId
  const currentWorkspaceId =
    routeWorkspaceId || activeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

  // Sync workspaceId to store
  useEffect(() => {
    if (currentWorkspaceId && currentWorkspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    }
  }, [currentWorkspaceId, activeWorkspaceId, setActiveWorkspaceId]);

  // Determine active section (defaults to 'account' if no workspace, otherwise 'account' or 'workspace')
  const validSectionIds = useMemo(() => SETTINGS_SECTIONS.map((s) => s.id), []);
  const activeSection = useMemo(() => {
    if (routeSection && validSectionIds.includes(routeSection)) {
      return routeSection;
    }
    return currentWorkspaceId ? 'workspace' : 'account';
  }, [routeSection, validSectionIds, currentWorkspaceId]);

  const handleSelectSection = (sectionId) => {
    if (currentWorkspaceId) {
      navigate(`/workspace/${currentWorkspaceId}/settings/${sectionId}`);
    } else {
      navigate(`/settings/${sectionId}`);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettings />;
      case 'workspace':
        return <WorkspaceSettings workspaceId={currentWorkspaceId} />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'editor':
        return <DeveloperSettings />;
      case 'environments':
        return <EnvironmentsSettingsSection workspaceId={currentWorkspaceId} />;
      case 'members':
        return <MembersSettingsSection workspaceId={currentWorkspaceId} />;
      case 'security':
        return <SecuritySettingsSection />;
      case 'shortcuts':
        return <ShortcutsSettingsSection />;
      default:
        return <AccountSettings />;
    }
  };

  const activeSectionMeta = SETTINGS_SECTIONS.find((s) => s.id === activeSection);

  return (
    <AppShell workspaceId={currentWorkspaceId}>
      <div className="flex-1 flex flex-col h-full bg-[#0d0f14] overflow-hidden">
        {/* Top Breadcrumb & Status Bar */}
        <header className="h-10 bg-[#111318] border-b border-[#232732] px-4 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <SettingsIcon size={14} className="text-sky-400" />
              <span>Settings</span>
            </div>
            <ChevronRight size={12} className="text-slate-600" />
            <span className="text-slate-100 font-medium">{activeSectionMeta?.label || 'General'}</span>
          </div>
        </header>

        {/* Small Screen Section Selector Dropdown / Pills */}
        <div className="lg:hidden p-3 bg-[#111318] border-b border-[#232732] flex items-center gap-2 overflow-x-auto select-none">
          {SETTINGS_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleSelectSection(sec.id)}
              className={`px-3 py-1 rounded-md text-xs whitespace-nowrap transition-all ${
                activeSection === sec.id
                  ? 'bg-sky-600 text-white font-medium'
                  : 'bg-[#181b22] text-slate-400 hover:text-slate-200 border border-[#2b313e]'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* Main Settings Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:block w-60 border-r border-[#232732] bg-[#111318]/50 p-3 overflow-y-auto shrink-0 select-none">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 px-3 py-1.5">
              Preferences
            </div>
            <SettingsSidebar
              activeSection={activeSection}
              onSelectSection={handleSelectSection}
              hasWorkspace={Boolean(currentWorkspaceId)}
            />
          </aside>

          {/* Right Main Content */}
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-4xl">
            {renderActiveSection()}
          </main>
        </div>
      </div>
    </AppShell>
  );
}
