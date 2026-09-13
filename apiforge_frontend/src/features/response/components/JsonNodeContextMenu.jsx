import { useEffect, useRef, useCallback } from 'react';
import { Copy, FlaskConical, Variable, FileCode } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function JsonNodeContextMenu({
  isOpen,
  onClose,
  anchorCoords = null,
  jsonPath,
  value,
  onCopyValue,
  onCopyPath,
  onCreateTest,
  onCreateExtraction,
  className,
}) {
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Adjust menu position so it doesn't bleed out of viewport
  const getStyle = useCallback(() => {
    if (!anchorCoords) return {};

    const { x, y } = anchorCoords;
    const menuWidth = 220;
    const menuHeight = 160;

    let left = x;
    let top = y;

    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }
    if (top + menuHeight > window.innerHeight - 10) {
      top = window.innerHeight - menuHeight - 10;
    }

    return {
      position: 'fixed',
      left: `${Math.max(10, left)}px`,
      top: `${Math.max(10, top)}px`,
      zIndex: 100,
    };
  }, [anchorCoords]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={getStyle()}
      className={cn(
        'w-56 bg-[#111318] border border-[#232732] rounded-md shadow-2xl p-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100 font-sans',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Path preview header */}
      <div className="px-2 py-1 mb-1 border-b border-[#1c202a] text-[10px] font-mono text-slate-400 truncate">
        {jsonPath || '$'}
      </div>

      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onCopyValue();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-slate-300 hover:text-white hover:bg-[#181b22] transition-colors cursor-pointer"
        >
          <Copy size={13} className="text-slate-400" />
          <span>Copy Value</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onCopyPath();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-slate-300 hover:text-white hover:bg-[#181b22] transition-colors cursor-pointer"
        >
          <FileCode size={13} className="text-slate-400" />
          <span>Copy JSON Path</span>
        </button>

        <div className="my-1 border-t border-[#1c202a]" />

        <button
          type="button"
          onClick={() => {
            onCreateTest(jsonPath, value);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sky-300 hover:text-sky-200 hover:bg-sky-950/40 transition-colors cursor-pointer font-medium"
        >
          <FlaskConical size={13} className="text-sky-400" />
          <span>Create Test Assertion</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onCreateExtraction(jsonPath, value);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40 transition-colors cursor-pointer font-medium"
        >
          <Variable size={13} className="text-emerald-400" />
          <span>Create Variable Extraction</span>
        </button>
      </div>
    </div>
  );
}
