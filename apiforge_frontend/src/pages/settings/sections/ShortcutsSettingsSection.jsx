import { useState, useMemo } from 'react';
import {
  SHORTCUTS,
  SHORTCUT_CATEGORIES,
} from '../../../features/shortcuts/constants/shortcutRegistry';
import { isMac, formatShortcutKey } from '../../../features/shortcuts/utils/shortcutUtils';
import { Search } from 'lucide-react';

export default function ShortcutsSettingsSection() {
  const [search, setSearch] = useState('');
  const isMacOS = useMemo(() => isMac(), []);

  const filteredShortcuts = useMemo(() => {
    const list = Object.values(SHORTCUTS);
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.keys.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [search]);

  // Group by category
  const categories = Object.values(SHORTCUT_CATEGORIES);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-100 tracking-wide">Keyboard Shortcuts</h2>
        <p className="text-xs text-slate-400 mt-1">
          Complete reference of built-in shortcuts and power-user keybindings.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shortcuts by action, key, or category..."
          className="w-full bg-[#14171f] border border-[#232732] rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Shortcuts List */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const items = filteredShortcuts.filter((s) => s.category === cat);
          if (items.length === 0) return null;

          return (
            <div key={cat} className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                {cat}
              </h3>
              <div className="rounded-lg bg-[#14171f] border border-[#232732] divide-y divide-[#232732]/60 overflow-hidden">
                {items.map((shortcut) => {
                  const displayKey = formatShortcutKey(shortcut.keys, isMacOS);
                  return (
                    <div
                      key={shortcut.id}
                      className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#181c26] transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-slate-200">{shortcut.label}</div>
                        {shortcut.description && (
                          <div className="text-[11px] text-slate-400">{shortcut.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 rounded bg-[#0b0e14] border border-[#232732] text-slate-300 font-mono text-[11px] shadow-sm">
                          {displayKey}
                        </kbd>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredShortcuts.length === 0 && (
          <div className="text-center py-10 text-xs text-slate-500">
            No keyboard shortcuts matching &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
