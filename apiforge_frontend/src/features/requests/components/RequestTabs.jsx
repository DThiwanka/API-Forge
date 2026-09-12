import { cn } from '../../../utils/cn';

export default function RequestTabs({
  activeTab,
  onTabChange,
  paramsCount = 0,
  headersCount = 0,
  testsCount = 0,
  extractionsCount = 0,
  hasAuth = false,
  hasBody = false,
  className,
}) {
  const tabs = [
    { id: 'params', label: 'Params', count: paramsCount },
    { id: 'headers', label: 'Headers', count: headersCount },
    { id: 'auth', label: 'Auth', activeIndicator: hasAuth },
    { id: 'body', label: 'Body', activeIndicator: hasBody },
    { id: 'settings', label: 'Settings', count: extractionsCount },
    { id: 'tests', label: 'Tests', count: testsCount },
  ];

  return (
    <div
      className={cn(
        'flex items-center px-4 bg-[#111318] border-b border-[#232732] gap-1 select-none overflow-x-auto',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative py-2.5 px-3 text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none border-b-2',
              isActive
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            )}
          >
            <span>{tab.label}</span>

            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-sky-500/20 text-sky-300 font-semibold">
                {tab.count}
              </span>
            )}

            {tab.activeIndicator && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}

