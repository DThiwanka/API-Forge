import { useState, useRef, useEffect } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import TabContextMenu from './TabContextMenu';
import { cn } from '../../../utils/cn';

const METHOD_COLORS = {
  GET: 'text-emerald-400',
  POST: 'text-amber-400',
  PUT: 'text-blue-400',
  PATCH: 'text-purple-400',
  DELETE: 'text-rose-400',
  HEAD: 'text-teal-400',
  OPTIONS: 'text-indigo-400',
};

export default function RequestTabBar({
  tabs = [],
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseAllTabs,
  onCopyUrl,
  onOpenInCanvas,
  onOpenInBrowser,
  onNewRequest,
  className,
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const scrollContainerRef = useRef(null);
  const overflowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!isOverflowOpen) return;
    const handleClickOutside = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setIsOverflowOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOverflowOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOverflowOpen]);

  // Check scroll bounds
  const updateScrollBounds = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    updateScrollBounds();
    window.addEventListener('resize', updateScrollBounds);
    return () => window.removeEventListener('resize', updateScrollBounds);
  }, [tabs]);

  // Scroll active tab into view
  useEffect(() => {
    if (!activeTabId || !scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  const handleScroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = 200;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // Wheel horizontal scrolling
  const handleWheel = (e) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      updateScrollBounds();
    }
  };

  const handleContextMenu = (e, tab) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tab,
    });
  };

  const contextTabIndex = contextMenu
    ? tabs.findIndex((t) => t.requestId === contextMenu.tab.requestId)
    : -1;
  const canCloseRight = contextTabIndex >= 0 && contextTabIndex < tabs.length - 1;
  const canCloseOthers = tabs.length > 1;

  return (
    <div
      className={cn(
        'h-9 bg-[#0b0d13] border-b border-[#212634] flex items-stretch select-none shrink-0 relative overflow-hidden',
        className
      )}
      role="tablist"
      aria-label="Open Request Tabs"
    >
      {/* Scroll Left Button if overflowed */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="h-full px-1.5 bg-[#0e1017] hover:bg-[#161a24] text-slate-400 hover:text-slate-200 border-r border-[#212634] transition-colors z-10 cursor-pointer flex items-center justify-center"
          title="Scroll tabs left"
        >
          <ChevronLeft size={13} />
        </button>
      )}

      {/* Tabs Horizontal List */}
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollBounds}
        onWheel={handleWheel}
        className="flex-1 flex items-stretch overflow-x-auto no-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = tab.requestId === activeTabId;
          const methodColor = METHOD_COLORS[tab.method] || 'text-slate-400';

          return (
            <div
              key={tab.requestId}
              data-tab-id={tab.requestId}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => onSelectTab(tab.requestId)}
              onAuxClick={(e) => {
                // Middle click closes tab
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(tab.requestId);
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectTab(tab.requestId);
                } else if (e.key === 'Delete') {
                  e.preventDefault();
                  e.stopPropagation();
                  onCloseTab(tab.requestId);
                }
              }}
              className={cn(
                'group relative flex items-center gap-2 px-3 py-1 text-xs border-r border-[#212634] cursor-pointer transition-colors max-w-[200px] min-w-[120px] focus:outline-none focus:bg-[#151926]',
                isActive
                  ? 'bg-[#131722] text-white font-semibold border-t-2 border-t-sky-400 shadow-xs'
                  : 'bg-[#0b0d13] text-slate-400 hover:text-slate-200 hover:bg-[#0f1118]'
              )}
              title={`${tab.method || 'GET'} ${tab.title || 'Untitled Request'}${tab.isDirty ? ' • (Unsaved)' : ''}`}
            >
              {/* Method badge */}
              <span className={cn('font-mono font-bold text-[10px] shrink-0', methodColor)}>
                {tab.method || 'GET'}
              </span>

              {/* Title */}
              <span className="truncate text-xs flex-1">
                {tab.title || 'Untitled Request'}
              </span>

              {/* Dirty status or Close button */}
              <div className="shrink-0 flex items-center justify-center w-4 h-4 ml-1">
                {tab.isDirty ? (
                  <>
                    {/* Dirty dot: shown normally, replaced by close icon on hover */}
                    <span
                      className="w-2 h-2 rounded-full bg-amber-400 group-hover:hidden transition-all"
                      title="Unsaved changes"
                      aria-label="Unsaved changes"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.requestId);
                      }}
                      className="hidden group-hover:flex items-center justify-center p-0.5 rounded hover:bg-[#252c3c] text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label={`Close ${tab.title || 'request'}`}
                    >
                      <X size={11} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.requestId);
                    }}
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center p-0.5 rounded hover:bg-[#252c3c] text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={`Close ${tab.title || 'request'}`}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll Right Button if overflowed */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="h-full px-1.5 bg-[#0e1017] hover:bg-[#161a24] text-slate-400 hover:text-slate-200 border-l border-[#212634] transition-colors z-10 cursor-pointer flex items-center justify-center"
          title="Scroll tabs right"
        >
          <ChevronRight size={13} />
        </button>
      )}

      {/* Tab Overflow Menu Button */}
      {tabs.length > 0 && (
        <div className="relative flex items-stretch" ref={overflowRef}>
          <button
            type="button"
            onClick={() => setIsOverflowOpen((prev) => !prev)}
            className={cn(
              'px-2 h-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#161a24] border-l border-[#212634] transition-colors cursor-pointer shrink-0',
              isOverflowOpen && 'bg-[#161a24] text-white'
            )}
            title="Open tabs list"
            aria-label="Open tabs list"
          >
            <ChevronDown size={13} className={cn('transition-transform duration-150', isOverflowOpen && 'rotate-180')} />
          </button>

          {isOverflowOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-64 max-h-80 overflow-y-auto bg-[#14171f] border border-[#2b313e] rounded-md shadow-2xl py-1 z-50 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-1.5 border-b border-[#232732] flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>OPEN TABS ({tabs.length})</span>
                {onCloseAllTabs && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowOpen(false);
                      onCloseAllTabs();
                    }}
                    className="text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Close All
                  </button>
                )}
              </div>
              <div className="py-1">
                {tabs.map((tab) => {
                  const isActive = tab.requestId === activeTabId;
                  const methodColor = METHOD_COLORS[tab.method] || 'text-slate-400';
                  return (
                    <div
                      key={tab.requestId}
                      onClick={() => {
                        onSelectTab(tab.requestId);
                        setIsOverflowOpen(false);
                      }}
                      className={cn(
                        'group flex items-center justify-between px-3 py-1.5 hover:bg-[#1f242e] cursor-pointer transition-colors',
                        isActive && 'bg-[#181d28] text-sky-400 font-medium'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={cn('font-mono font-bold text-[10px] shrink-0', methodColor)}>
                          {tab.method || 'GET'}
                        </span>
                        <span className="truncate text-xs text-slate-300 group-hover:text-white">
                          {tab.title || 'Untitled Request'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {tab.isDirty && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-amber-400"
                            title="Unsaved changes"
                          />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseTab(tab.requestId);
                          }}
                          className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-[#28303f] transition-colors"
                          title="Close tab"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Request Button */}
      {onNewRequest && (
        <button
          type="button"
          onClick={onNewRequest}
          className="px-2.5 h-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#161a24] border-l border-[#212634] transition-colors cursor-pointer shrink-0"
          title="New Request (+)"
          aria-label="Create new request"
        >
          <Plus size={14} />
        </button>
      )}

      {/* Context Menu */}
      <TabContextMenu
        isOpen={Boolean(contextMenu)}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        tab={contextMenu?.tab}
        canCloseRight={canCloseRight}
        canCloseOthers={canCloseOthers}
        onCloseMenu={() => setContextMenu(null)}
        onCloseTab={onCloseTab}
        onCloseOtherTabs={onCloseOtherTabs}
        onCloseTabsToRight={onCloseTabsToRight}
        onCloseAllTabs={onCloseAllTabs}
        onCopyUrl={onCopyUrl}
        onOpenInCanvas={onOpenInCanvas}
        onOpenInBrowser={onOpenInBrowser}
      />
    </div>
  );
}

