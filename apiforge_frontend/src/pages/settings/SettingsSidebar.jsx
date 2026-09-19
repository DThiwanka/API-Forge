import { SETTINGS_SECTIONS } from './constants/settingsSections';
import { cn } from '../../utils/cn';

export { SETTINGS_SECTIONS };

export default function SettingsSidebar({
  activeSection,
  onSelectSection,
  hasWorkspace,
}) {
  return (
    <nav aria-label="Settings Navigation" className="space-y-1">
      {SETTINGS_SECTIONS.map((section) => {
        const IconComponent = section.icon;
        const isActive = activeSection === section.id;
        const isDisabled = section.scope === 'workspace' && !hasWorkspace;

        return (
          <button
            key={section.id}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onSelectSection(section.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors text-left',
              isActive
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent',
              isDisabled && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-slate-300'
            )}
            title={isDisabled ? 'Select a workspace to access this section' : undefined}
          >
            <IconComponent className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-400' : 'text-slate-400')} />
            <span className="truncate flex-1">{section.label}</span>
            {section.scope === 'workspace' && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                ws
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
