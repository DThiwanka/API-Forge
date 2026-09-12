import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal } from 'lucide-react';
import useCommandCenterStore from '../store/commandCenterStore';
import { useCommandCenter } from '../hooks/useCommandCenter';
import CommandSearch from './CommandSearch';
import CommandGroup from './CommandGroup';
import CommandItem from './CommandItem';
import CreateRequestDialog from '../../collections/components/CreateRequestDialog';
import CreateCollectionDialog from '../../collections/components/CreateCollectionDialog';

export default function CommandCenter({ workspaceId }) {
  const {
    isOpen,
    query,
    setQuery,
    close,
    filteredCommands,
    groupedCommands,
    executeCommand,
  } = useCommandCenter(workspaceId);

  const activeModal = useCommandCenterStore((s) => s.activeModal);
  const modalContext = useCommandCenterStore((s) => s.modalContext);
  const closeModal = useCommandCenterStore((s) => s.closeModal);

  const [rawSelectedIndex, setRawSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);

  // Derive effective selected index safely clamped to the filtered results length
  const total = filteredCommands.length;
  const selectedIndex = total === 0 ? 0 : Math.min(rawSelectedIndex, total - 1);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen || !resultsContainerRef.current) return;
    const selectedElement = resultsContainerRef.current.querySelector(
      `[aria-selected="true"]`
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [selectedIndex, isOpen]);

  // Handle keyboard events (ArrowUp, ArrowDown, Enter, Escape, Home, End)
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (total === 0) return;
        setRawSelectedIndex((prev) => (prev + 1) % total);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (total === 0) return;
        setRawSelectedIndex((prev) => (prev - 1 + total) % total);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (total > 0 && filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setRawSelectedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        if (total > 0) setRawSelectedIndex(total - 1);
      }
    },
    [total, filteredCommands, selectedIndex, executeCommand, close]
  );

  const handleSearchChange = useCallback(
    (newQuery) => {
      setQuery(newQuery);
      setRawSelectedIndex(0);
    },
    [setQuery]
  );

  // Flatten index lookup to map grouped items to their linear index
  let itemCounter = -1;

  if (!isOpen && !activeModal) return null;

  return (
    <>
      {/* Command Center Palette Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command Center"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="w-full max-w-xl bg-[#111318] border border-[#2b313e] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <CommandSearch
              inputRef={inputRef}
              value={query}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onClear={() => handleSearchChange('')}
            />

            {/* Results List */}
            <div
              id="command-center-results"
              ref={resultsContainerRef}
              role="listbox"
              className="flex-1 overflow-y-auto px-2 py-2 space-y-1 divide-y divide-[#232732]/40"
            >
              {filteredCommands.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-500 text-xs">
                  <div className="w-8 h-8 rounded-full bg-[#181b22] border border-[#2b313e] flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <Terminal size={14} />
                  </div>
                  <p className="font-medium text-slate-300">No matching commands or requests</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Try searching for an HTTP method, request name, or action.
                  </p>
                </div>
              ) : (
                groupedCommands.map((group) => (
                  <CommandGroup key={group.group} heading={group.group}>
                    {group.items.map((cmd) => {
                      itemCounter += 1;
                      const currentIndex = itemCounter;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <CommandItem
                          key={cmd.id}
                          command={cmd}
                          isSelected={isSelected}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setRawSelectedIndex(currentIndex)}
                        />
                      );
                    })}
                  </CommandGroup>
                ))
              )}
            </div>

            {/* Bottom Footer Help */}
            <div className="px-3.5 py-2 border-t border-[#232732] bg-[#14171f]/80 flex items-center justify-between text-[11px] text-slate-500 select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 rounded bg-[#1c212c] border border-[#2b313e] font-mono text-[9px] text-slate-400">↑</kbd>
                  <kbd className="px-1 rounded bg-[#1c212c] border border-[#2b313e] font-mono text-[9px] text-slate-400">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 rounded bg-[#1c212c] border border-[#2b313e] font-mono text-[9px] text-slate-400">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 rounded bg-[#1c212c] border border-[#2b313e] font-mono text-[9px] text-slate-400">esc</kbd>
                  Close
                </span>
              </div>
              <div className="font-mono text-[10px] text-slate-500">
                {filteredCommands.length} {filteredCommands.length === 1 ? 'item' : 'items'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Action Modals */}
      {activeModal === 'create-request' && (
        <CreateRequestDialog
          isOpen={true}
          onClose={closeModal}
          workspaceId={workspaceId}
          collectionId={modalContext.collectionId || null}
          folderId={modalContext.folderId || null}
        />
      )}

      {activeModal === 'create-collection' && (
        <CreateCollectionDialog
          isOpen={true}
          onClose={closeModal}
          workspaceId={workspaceId}
        />
      )}
    </>
  );
}
