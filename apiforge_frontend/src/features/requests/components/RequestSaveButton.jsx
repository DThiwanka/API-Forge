import { Save, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RequestSaveButton({ isSaving, isDirty, onSave, className }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving || !isDirty}
      title="Save Changes (Ctrl+S)"
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs font-medium text-slate-200 transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none',
        isDirty && 'border-amber-500/40 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20',
        className
      )}
    >
      {isSaving ? (
        <>
          <Loader2 size={13} className="animate-spin text-slate-400" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Save size={13} className={isDirty ? 'text-amber-400' : 'text-slate-400'} />
          <span>Save</span>
          {isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </>
      )}
    </button>
  );
}

