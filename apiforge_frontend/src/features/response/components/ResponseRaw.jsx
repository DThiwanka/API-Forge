import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function ResponseRaw({ response, className }) {
  const [copied, setCopied] = useState(false);

  const rawHttp = useMemo(() => {
    if (!response) return '';
    const statusLine = `HTTP/1.1 ${response.status || 200} ${response.statusText || 'OK'}`;
    const headerLines = Object.entries(response.headers || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    let bodyStr = '';
    if (response.body !== undefined && response.body !== null) {
      bodyStr =
        typeof response.body === 'object'
          ? JSON.stringify(response.body, null, 2)
          : String(response.body);
    }

    return `${statusLine}\n${headerLines}\n\n${bodyStr}`;
  }, [response]);

  const handleCopy = () => {
    if (!rawHttp) return;
    navigator.clipboard.writeText(rawHttp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative flex-1 flex flex-col min-h-0', className)}>
      <div className="absolute top-3 right-4 z-10">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 font-mono transition-colors shadow-md"
          title="Copy raw HTTP response"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} className="text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-xs bg-[#090a0f] text-slate-300 select-text whitespace-pre leading-relaxed">
        {rawHttp}
      </div>
    </div>
  );
}

