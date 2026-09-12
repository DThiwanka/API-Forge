import { Send, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RequestSendButton({ isExecuting = false, onSend, disabled = false, className }) {
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={isExecuting || disabled}
      title={disabled ? 'Enter a URL to send request' : 'Send Request (Ctrl+Enter)'}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-r-md font-medium text-xs border border-l-0 transition-all select-none shadow-sm focus:outline-none shrink-0',
        isExecuting
          ? 'bg-sky-700/80 border-sky-600 text-white cursor-wait opacity-90'
          : disabled
            ? 'bg-[#181b22] border-[#2b313e] text-slate-500 opacity-60 cursor-not-allowed'
            : 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700 border-sky-500 text-white cursor-pointer hover:shadow-sky-500/20 hover:shadow-md',
        className
      )}
    >
      {isExecuting ? (
        <>
          <Loader2 size={13} className="animate-spin text-white" />
          <span>Sending...</span>
        </>
      ) : (
        <>
          <Send size={13} />
          <span className="font-semibold">Send</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded bg-sky-700/60 border border-sky-400/30 text-[10px] font-mono text-sky-200">
            Ctrl+↵
          </kbd>
        </>
      )}
    </button>
  );
}
