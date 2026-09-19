import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Keyboard, X } from 'lucide-react';
import { SHORTCUTS, SHORTCUT_CATEGORIES } from '../constants/shortcutRegistry.js';
import { formatShortcutKey, isMac } from '../utils/shortcutUtils.js';
import useShortcutStore from '../store/shortcutStore.js';

export default function KeyboardShortcutsModal() {
  const isOpen = useShortcutStore((s) => s.isHelpModalOpen);
  const close = useShortcutStore((s) => s.closeHelpModal);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const isMacOS = useMemo(() => isMac(), []);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    close();
  }, [close]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleClose]);

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUTS;
    const q = searchQuery.toLowerCase().trim();
    return SHORTCUTS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.keys.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    Object.values(SHORTCUT_CATEGORIES).forEach((cat) => {
      groups[cat] = [];
    });

    filteredShortcuts.forEach((s) => {
      if (!groups[s.category]) {
        groups[s.category] = [];
      }
      groups[s.category].push(s);
    });

    return groups;
  }, [filteredShortcuts]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div className="bg-[#111319] border border-[#262c3d] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#212636] flex items-center justify-between bg-[#141720]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-sky-950/60 border border-sky-600/30 text-sky-400">
              <Keyboard size={16} />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-sm font-semibold text-slate-100">
                Keyboard Shortcuts
              </h2>
              <p className="text-[11px] text-slate-400">
                Power-user shortcuts for fast API development
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f2433] transition-colors"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-[#1d2230] bg-[#12151e]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts (e.g. save, send, canvas, tab)..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#171a24] border border-[#262d3e] focus:border-sky-500 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 divide-y divide-[#1e2333]/60">
          {Object.entries(grouped).map(([category, items]) => {
            if (!items || items.length === 0) return null;
            return (
              <div key={category} className="pt-4 first:pt-0 space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400/90 font-mono">
                  {category}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#141722]/60 hover:bg-[#181c2b] border border-[#1f2536] transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="text-xs font-medium text-slate-200">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <kbd className="px-2 py-0.5 rounded bg-[#1f2536] border border-[#2f384f] text-[11px] font-mono text-sky-300 font-semibold shadow-xs">
                          {formatShortcutKey(item.keys, isMacOS)}
                        </kbd>
                        {item.alternateKeys?.map((altKey) => (
                          <span key={altKey} className="text-slate-500 text-[10px] flex items-center gap-1">
                            or
                            <kbd className="px-1.5 py-0.5 rounded bg-[#1b202e] border border-[#272e42] text-[10px] font-mono text-slate-400">
                              {formatShortcutKey(altKey, isMacOS)}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              No shortcuts found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[#1e2333] bg-[#141720] flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Platform: <strong className="text-slate-400">{isMacOS ? 'macOS (⌘)' : 'Windows/Linux (Ctrl)'}</strong>
          </span>
          <span>
            Press <kbd className="px-1 py-0.5 rounded bg-[#1e2433] text-slate-400 font-mono text-[10px]">Esc</kbd> to dismiss
          </span>
        </div>
      </div>
    </div>
  );
}
