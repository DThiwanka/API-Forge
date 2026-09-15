import { Move, Copy, Trash2, Network, X } from 'lucide-react';

export default function SelectionToolbar({
  selectedCount = 0,
  onMove,
  onDuplicate,
  onDelete,
  onAddToCanvas,
  onClear,
  onSelectAllVisible,
  hasVisibleMatches = false,
  isViewer = false,
  isDuplicating = false,
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Selection Actions Toolbar"
      className="bg-[#181c26] border border-[#2b3140] rounded px-2.5 py-1.5 text-xs shadow-lg flex items-center justify-between gap-1.5 animate-in fade-in duration-150"
    >
      {/* Selection Count Badge */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-semibold border border-sky-500/30">
          {selectedCount}
        </span>
        <span className="text-slate-300 font-medium truncate text-[11px]">
          selected
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Add to Canvas */}
        <button
          type="button"
          onClick={onAddToCanvas}
          className="p-1 rounded text-slate-300 hover:text-sky-300 hover:bg-[#232732] transition-colors cursor-pointer"
          title="Add selected to Canvas"
          aria-label="Add selected to Canvas"
        >
          <Network size={13} />
        </button>

        {!isViewer && (
          <>
            {/* Move */}
            <button
              type="button"
              onClick={onMove}
              className="p-1 rounded text-slate-300 hover:text-amber-300 hover:bg-[#232732] transition-colors cursor-pointer"
              title="Move selected requests"
              aria-label="Move selected requests"
            >
              <Move size={13} />
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={onDuplicate}
              disabled={isDuplicating}
              className="p-1 rounded text-slate-300 hover:text-sky-300 hover:bg-[#232732] transition-colors cursor-pointer disabled:opacity-50"
              title="Duplicate selected requests"
              aria-label="Duplicate selected requests"
            >
              <Copy size={13} />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded text-slate-300 hover:text-rose-400 hover:bg-[#232732] transition-colors cursor-pointer"
              title="Delete selected requests"
              aria-label="Delete selected requests"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}

        {/* Clear Selection */}
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#232732] transition-colors cursor-pointer ml-1"
          title="Clear selection"
          aria-label="Clear selection"
        >
          <X size={13} />
        </button>
      </div>

      {/* Select All Visible Shortcut if filtering */}
      {hasVisibleMatches && onSelectAllVisible && (
        <button
          type="button"
          onClick={onSelectAllVisible}
          className="text-[10px] text-sky-400 hover:text-sky-300 underline underline-offset-2 ml-1 cursor-pointer"
          title="Select all currently visible requests"
        >
          All visible
        </button>
      )}
    </div>
  );
}

