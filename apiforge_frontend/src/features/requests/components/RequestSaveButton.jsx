import { Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RequestSaveButton({
  isSaving = false,
  isDirty = false,
  isError = false,
  onSave,
  className,
}) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving || !isDirty}
      title={isDirty ? 'Save Changes (Ctrl+S)' : 'All changes saved to server'}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all focus:outline-none select-none border',
        // Saving state
        isSaving && 'bg-[#181b22] border-[#2b313e] text-sky-400 opacity-90 cursor-wait',
        // Error state
        !isSaving && isError && 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-950/60 cursor-pointer',
        // Dirty / Unsaved state
        !isSaving && !isError && isDirty && 'bg-amber-500/15 border-amber-500/40 text-amber-200 hover:bg-amber-500/25 cursor-pointer shadow-sm',
        // Clean / Saved state
        !isSaving && !isError && !isDirty && 'bg-[#14171f] border-[#232732] text-slate-400 opacity-70 cursor-default',
        className
      )}
    >
      {isSaving ? (
        <>
          <Loader2 size={13} className="animate-spin text-sky-400" />
          <span>Saving...</span>
        </>
      ) : isError ? (
        <>
          <AlertCircle size={13} className="text-rose-400" />
          <span>Save Failed</span>
        </>
      ) : isDirty ? (
        <>
          <Save size={13} className="text-amber-400" />
          <span>Save</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded bg-amber-950/50 border border-amber-700/50 font-mono text-[10px] text-amber-300">
            Ctrl+S
          </kbd>
        </>
      ) : (
        <>
          <Check size={13} className="text-emerald-400" />
          <span className="text-slate-400">Saved</span>
        </>
      )}
    </button>
  );
}
