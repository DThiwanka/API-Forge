import ResponseSearch from './ResponseSearch';
import { cn } from '../../../utils/cn';

export default function ResponseTabs({
  activeTab = 'body',
  onTabChange,
  headersCount = 0,
  bodyMode = 'pretty',
  onBodyModeChange,
  searchQuery = '',
  onSearchChange,
  onClearSearch,
  matchCount = 0,
  className,
}) {
  const tabs = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers', count: headersCount },
    { id: 'cookies', label: 'Cookies' },
    { id: 'raw', label: 'Raw' },
  ];

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 bg-[#111318] border-b border-[#232732] gap-2 select-none overflow-x-auto min-h-[38px]',
        className
      )}
    >
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative py-2 px-3 text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none border-b-2',
                isActive
                  ? 'border-sky-500 text-sky-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#232732] text-slate-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {activeTab === 'body' && (
          <>
            <div className="flex items-center bg-[#181b22] p-0.5 rounded border border-[#2b313e]">
              <button
                type="button"
                onClick={() => onBodyModeChange('pretty')}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-medium rounded transition-colors',
                  bodyMode === 'pretty'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Pretty
              </button>
              <button
                type="button"
                onClick={() => onBodyModeChange('raw')}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-medium rounded transition-colors',
                  bodyMode === 'raw'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Raw
              </button>
            </div>

            <ResponseSearch
              query={searchQuery}
              onChange={onSearchChange}
              onClear={onClearSearch}
              matchCount={matchCount}
            />
          </>
        )}
      </div>
    </div>
  );
}

