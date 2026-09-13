import { useRef } from 'react';
import { cn } from '../../../utils/cn';

const AUTH_LABELS = {
  bearer: 'Bearer',
  basic: 'Basic',
  'api-key': 'API Key',
};

const BODY_LABELS = {
  json: 'JSON',
  text: 'Text',
  'x-www-form-urlencoded': 'Form',
  'form-data': 'Multipart',
  raw: 'Raw',
};

export default function RequestTabs({
  activeTab = 'params',
  onTabChange,
  paramsCount = 0,
  headersCount = 0,
  testsCount = 0,
  extractionsCount = 0,
  hasAuth = false,
  authType = 'none',
  hasBody = false,
  bodyMode = 'none',
  className,
}) {
  const tabRefs = useRef([]);

  const tabs = [
    {
      id: 'params',
      label: 'Params',
      shortcut: 'Alt+1',
      count: paramsCount,
      badge: paramsCount > 0 ? `${paramsCount}` : null,
      badgeClass: 'bg-sky-500/20 text-sky-300',
    },
    {
      id: 'headers',
      label: 'Headers',
      shortcut: 'Alt+2',
      count: headersCount,
      badge: headersCount > 0 ? `${headersCount}` : null,
      badgeClass: 'bg-sky-500/20 text-sky-300',
    },
    {
      id: 'auth',
      label: 'Auth',
      shortcut: 'Alt+3',
      activeIndicator: hasAuth,
      indicatorTitle: hasAuth ? `Auth configured (${AUTH_LABELS[authType] || authType})` : 'No authentication',
      pill: hasAuth && authType !== 'none' ? (AUTH_LABELS[authType] || authType) : null,
      pillClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'body',
      label: 'Body',
      shortcut: 'Alt+4',
      activeIndicator: hasBody,
      indicatorTitle: hasBody ? `Body configured (${BODY_LABELS[bodyMode] || bodyMode})` : 'No request body',
      pill: hasBody && bodyMode !== 'none' ? (BODY_LABELS[bodyMode] || bodyMode) : null,
      pillClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
    },
    {
      id: 'settings',
      label: 'Settings',
      shortcut: 'Alt+5',
      count: extractionsCount,
      badge: extractionsCount > 0 ? `${extractionsCount}` : null,
      badgeClass: 'bg-indigo-500/20 text-indigo-300',
    },
    {
      id: 'tests',
      label: 'Tests',
      shortcut: 'Alt+6',
      count: testsCount,
      badge: testsCount > 0 ? `${testsCount}` : null,
      badgeClass: 'bg-purple-500/20 text-purple-300',
    },
  ];

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (index + 1) % tabs.length;
      onTabChange?.(tabs[nextIdx].id);
      tabRefs.current[nextIdx]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (index - 1 + tabs.length) % tabs.length;
      onTabChange?.(tabs[prevIdx].id);
      tabRefs.current[prevIdx]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Request Configuration Sections"
      className={cn(
        'flex items-center px-4 bg-[#111318] border-b border-[#232732] gap-1 select-none overflow-x-auto min-h-[40px]',
        className
      )}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            role="tab"
            id={`req-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`req-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            title={`${tab.label} (${tab.shortcut})`}
            className={cn(
              'relative py-2.5 px-3 text-xs font-medium transition-all flex items-center gap-1.5 focus:outline-none border-b-2 cursor-pointer shrink-0',
              isActive
                ? 'border-sky-500 text-sky-400 font-semibold bg-[#161a23]/60 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161a23]/30 rounded-t'
            )}
          >
            <span>{tab.label}</span>

            {/* Numeric Count Badge */}
            {tab.badge && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold',
                  tab.badgeClass
                )}
              >
                {tab.badge}
              </span>
            )}

            {/* Mode / Type Pill */}
            {tab.pill && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-medium tracking-tight',
                  tab.pillClass
                )}
              >
                {tab.pill}
              </span>
            )}

            {/* Configured Dot Indicator fallback */}
            {tab.activeIndicator && !tab.pill && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                title={tab.indicatorTitle}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
