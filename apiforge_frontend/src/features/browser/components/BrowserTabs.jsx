import { memo, useState, useRef, useEffect } from 'react';
import { Plus, X, Globe, Loader2, RotateCw, Code2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

function BrowserTabsComponent({
  tabs = [],
  activeTabId,
  onSwitchTab,
  onNewTab,
  onCloseTab,
  onReload,
  onOpenInApiClient,
}) {
  const [contextMenu, setContextMenu] = useState(null); // { x, y, tab }
  const menuRef = useRef(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);
  return (
    <div className="flex items-center h-9 bg-[#0d0f14] border-b border-[#232732] px-2 select-none overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const displayTitle = tab.title || (tab.url ? new URL(tab.url).hostname : 'New Tab');

          return (
            <div
              key={tab.id}
              onClick={() => onSwitchTab(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, tab });
              }}
              className={cn(
                'group relative flex items-center gap-2 h-7.5 px-3 rounded-t-lg text-xs font-medium cursor-pointer transition-colors max-w-[200px] border-t border-x shrink-0',
                isActive
                  ? 'bg-[#151824] text-slate-100 border-[#2b313e] border-b-transparent shadow-xs'
                  : 'bg-[#0f1118] text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#141720]'
              )}
              title={tab.url ? `${displayTitle} (${tab.url})` : displayTitle}
            >
              {/* Tab Icon or Loading Spinner */}
              <div className="shrink-0 text-slate-400">
                {tab.loading ? (
                  <Loader2 size={12} className="animate-spin text-sky-400" />
                ) : (
                  <Globe size={12} className={isActive ? 'text-sky-400' : 'text-slate-500'} />
                )}
              </div>

              {/* Tab Title */}
              <span className="truncate text-[11px] select-none">
                {displayTitle}
              </span>

              {/* Close Tab Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={cn(
                  'p-0.5 rounded-md hover:bg-[#252a38] text-slate-400 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer',
                  isActive && 'opacity-80'
                )}
                title="Close tab"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>

      {/* New Tab Button */}
      <button
        type="button"
        onClick={onNewTab}
        className="ml-1 p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-[#181b22] transition-colors cursor-pointer shrink-0"
        title="Open new tab"
        aria-label="New Tab"
      >
        <Plus size={14} />
      </button>

      {/* Tab Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 150)}px`,
            zIndex: 9999,
          }}
          className="w-44 bg-[#12151f] border border-[#272f42] rounded-md shadow-2xl p-1 text-xs select-none animate-in fade-in duration-75"
        >
          {onReload && (
            <button
              type="button"
              onClick={() => {
                const targetTab = contextMenu.tab;
                setContextMenu(null);
                onReload?.(targetTab);
              }}
              className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-slate-200 hover:bg-[#1c2232] hover:text-white transition-colors cursor-pointer text-left"
            >
              <RotateCw size={12} className="text-slate-400" />
              <span>Reload</span>
            </button>
          )}

          {contextMenu.tab?.url && onOpenInApiClient && (
            <button
              type="button"
              onClick={() => {
                const targetTab = contextMenu.tab;
                setContextMenu(null);
                onOpenInApiClient?.(targetTab);
              }}
              className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-slate-200 hover:bg-[#1c2232] hover:text-white transition-colors cursor-pointer text-left"
            >
              <Code2 size={12} className="text-sky-400" />
              <span>Open in API Client</span>
            </button>
          )}

          <div className="h-px bg-[#232732] my-1" />

          <button
            type="button"
            onClick={() => {
              const tabId = contextMenu.tab.id;
              setContextMenu(null);
              onCloseTab(tabId);
            }}
            className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors cursor-pointer text-left"
          >
            <X size={12} />
            <span>Close Tab</span>
          </button>
        </div>
      )}
    </div>
  );
}

export const BrowserTabs = memo(BrowserTabsComponent);
export default BrowserTabs;

