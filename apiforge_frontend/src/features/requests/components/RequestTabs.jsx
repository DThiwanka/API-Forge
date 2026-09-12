import { useRef } from 'react';
import { cn } from '../../../utils/cn';

export default function RequestTabs({
  activeTab = 'params',
  onTabChange,
  paramsCount = 0,
  headersCount = 0,
  testsCount = 0,
  extractionsCount = 0,
  hasAuth = false,
  hasBody = false,
  className,
}) {
  const tabRefs = useRef([]);

  const tabs = [
    { id: 'params', label: 'Params', count: paramsCount },
    { id: 'headers', label: 'Headers', count: headersCount },
    { id: 'auth', label: 'Auth', activeIndicator: hasAuth, indicatorTitle: 'Auth is configured' },
    { id: 'body', label: 'Body', activeIndicator: hasBody, indicatorTitle: 'Request body is configured' },
    { id: 'settings', label: 'Settings', count: extractionsCount },
    { id: 'tests', label: 'Tests', count: testsCount },
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
            ref={(el) => (tabRefs.current[idx] = el)}
            role="tab"
            id={`req-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`req-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'relative py-2.5 px-3 text-xs font-medium transition-all flex items-center gap-1.5 focus:outline-none border-b-2 cursor-pointer',
              isActive
                ? 'border-sky-500 text-sky-400 font-semibold bg-[#161a23]/60 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161a23]/30 rounded-t'
            )}
          >
            <span>{tab.label}</span>

            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-sky-500/20 text-sky-300 font-semibold">
                {tab.count}
              </span>
            )}

            {tab.activeIndicator && (
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
