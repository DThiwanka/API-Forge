import { Send, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RequestSendButton({ isExecuting, onSend, disabled, className }) {
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={isExecuting || disabled}
      title="Send Request (Ctrl+Enter)"
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-r-md bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-medium text-xs border border-l-0 border-sky-500 transition-colors focus:outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
        className
      )}
    >
      {isExecuting ? (
        <>
          <Loader2 size={13} className="animate-spin" />
          <span>Sending...</span>
        </>
      ) : (
        <>
          <Send size={13} />
          <span>Send</span>
          <span className="text-[10px] opacity-75 font-mono hidden sm:inline">↵</span>
        </>
      )}
    </button>
  );
}

