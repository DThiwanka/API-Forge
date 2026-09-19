import { useSettingsStore } from '../../../stores/settingsStore';
import { Moon, Monitor, LayoutGrid, Rows3, EyeOff } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function AppearanceSettings() {
  const {
    theme,
    density,
    reducedMotion,
    setTheme,
    setDensity,
    setReducedMotion,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-100 tracking-wide">Appearance</h2>
        <p className="text-xs text-slate-400 mt-1">
          Customize the visual interface, display density, and motion preferences.
        </p>
      </div>

      {/* Theme Preference */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">Color Theme</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Select your preferred interface color mode.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
              theme === 'dark'
                ? 'border-blue-500/50 bg-blue-600/10 text-slate-100 ring-1 ring-blue-500/20'
                : 'border-[#232732] bg-[#0d1017] text-slate-300 hover:border-slate-700'
            )}
          >
            <div className={cn('p-2 rounded', theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400')}>
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium">Dark Graphite (Default)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Engineered for high-contrast API development in low light.</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
              theme === 'system'
                ? 'border-blue-500/50 bg-blue-600/10 text-slate-100 ring-1 ring-blue-500/20'
                : 'border-[#232732] bg-[#0d1017] text-slate-300 hover:border-slate-700'
            )}
          >
            <div className={cn('p-2 rounded', theme === 'system' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400')}>
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium">Sync with OS / System</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Automatically syncs with your operating system preference.</div>
            </div>
          </button>
        </div>
      </div>

      {/* Display Density */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">Display Density</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Adjust the padding and spacing of lists, sidebars, and request workbench controls.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDensity('comfortable')}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
              density === 'comfortable'
                ? 'border-blue-500/50 bg-blue-600/10 text-slate-100 ring-1 ring-blue-500/20'
                : 'border-[#232732] bg-[#0d1017] text-slate-300 hover:border-slate-700'
            )}
          >
            <div className={cn('p-2 rounded', density === 'comfortable' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400')}>
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium">Comfortable (Default)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Standard padding with balanced breathing room for all devices.</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDensity('compact')}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
              density === 'compact'
                ? 'border-blue-500/50 bg-blue-600/10 text-slate-100 ring-1 ring-blue-500/20'
                : 'border-[#232732] bg-[#0d1017] text-slate-300 hover:border-slate-700'
            )}
          >
            <div className={cn('p-2 rounded', density === 'compact' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400')}>
              <Rows3 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium">Compact</div>
              <div className="text-[11px] text-slate-400 mt-0.5">High-density information layout optimized for power users and smaller screens.</div>
            </div>
          </button>
        </div>
      </div>

      {/* Reduced Motion */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-200">Reduced Motion</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-md">
            Minimizes transitions, sliding tabs, and canvas animations for accessibility and battery conservation.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={reducedMotion}
          onClick={() => setReducedMotion(!reducedMotion)}
          className={cn(
            'relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900',
            reducedMotion ? 'bg-blue-600' : 'bg-slate-700'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              reducedMotion ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>
    </div>
  );
}
