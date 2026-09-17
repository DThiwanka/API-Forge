import { useEffect, useRef } from 'react';
import { X, ArrowRightToLine, Layers, XCircle, Link as LinkIcon, Sparkles, Compass } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function TabContextMenu({
  isOpen,
  x,
  y,
  tab,
  canCloseRight,
  canCloseOthers,
  onCloseMenu,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseAllTabs,
  onCopyUrl,
  onOpenInCanvas,
  onOpenInBrowser,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onCloseMenu();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseMenu();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCloseMenu]);

  if (!isOpen || !tab) return null;

  // Prevent context menu from rendering off-screen
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - 200);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-48 rounded-md bg-[#12151f] border border-[#272f42] shadow-2xl p-1 text-xs select-none animate-in fade-in duration-75"
    >
      <button
        type="button"
        onClick={() => {
          onCloseMenu();
          onCloseTab(tab.requestId);
        }}
        className="w-full px-2.5 py-1.5 rounded flex items-center justify-between text-slate-200 hover:bg-[#1c2232] hover:text-white transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <X size={12} className="text-slate-400" />
          <span>Close</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono">Ctrl+W</span>
      </button>

      <button
        type="button"
        disabled={!canCloseOthers}
        onClick={() => {
          onCloseMenu();
          onCloseOtherTabs(tab.requestId);
        }}
        className={cn(
          'w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-slate-200 hover:bg-[#1c2232] hover:text-white transition-colors cursor-pointer',
          !canCloseOthers && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-slate-200'
        )}
      >
        <Layers size={12} className="text-slate-400" />
        <span>Close Others</span>
      </button>

      <button
        type="button"
        disabled={!canCloseRight}
        onClick={() => {
          onCloseMenu();
          onCloseTabsToRight(tab.requestId);
        }}
        className={cn(
          'w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-slate-200 hover:bg-[#1c2232] hover:text-white transition-colors cursor-pointer',
          !canCloseRight && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-slate-200'
        )}
      >
        <ArrowRightToLine size={12} className="text-slate-400" />
        <span>Close to Right</span>
      </button>

      {onCloseAllTabs && (
        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            onCloseAllTabs();
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <XCircle size={12} />
          <span>Close All</span>
        </button>
      )}

      {(onCopyUrl || onOpenInCanvas || onOpenInBrowser) && (
        <div className="h-px bg-[#232732] my-1" />
      )}

      {onCopyUrl && (
        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            onCopyUrl(tab);
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-slate-200 hover:bg-[#1c2232] hover:text-white transition-colors cursor-pointer"
        >
          <LinkIcon size={12} className="text-slate-400" />
          <span>Copy URL</span>
        </button>
      )}

      {onOpenInBrowser && tab.url && (
        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            onOpenInBrowser(tab);
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-slate-200 hover:bg-[#1c2232] hover:text-white transition-colors cursor-pointer"
        >
          <Compass size={12} className="text-teal-400" />
          <span>Open in Browser</span>
        </button>
      )}

      {onOpenInCanvas && (
        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            onOpenInCanvas(tab);
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-slate-200 hover:bg-[#1c2232] hover:text-white transition-colors cursor-pointer"
        >
          <Sparkles size={12} className="text-sky-400" />
          <span>Open in Canvas</span>
        </button>
      )}
    </div>
  );
}

