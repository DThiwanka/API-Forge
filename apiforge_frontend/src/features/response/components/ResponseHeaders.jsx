import { useState, useMemo } from 'react';
import { Copy, Check, Search } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function ResponseHeaders({ headers = {}, className }) {
  const [filter, setFilter] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const headerEntries = useMemo(() => {
    if (!headers || typeof headers !== 'object') return [];
    return Object.entries(headers).filter(([key, val]) => {
      if (!filter.trim()) return true;
      const lower = filter.toLowerCase();
      return (
        key.toLowerCase().includes(lower) ||
        String(val).toLowerCase().includes(lower)
      );
    });
  }, [headers, filter]);

  const handleCopyValue = (key, value) => {
    navigator.clipboard.writeText(String(value));
    setCopiedKey(`${key}-val`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyEntry = (key, value) => {
    navigator.clipboard.writeText(`${key}: ${value}`);
    setCopiedKey(`${key}-full`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAll = () => {
    if (!headers || typeof headers !== 'object') return;
    const text = Object.entries(headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className={cn('flex-1 flex flex-col min-h-0 p-4 space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Response Headers ({Object.keys(headers || {}).length})
          </span>

          {Object.keys(headers || {}).length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 font-mono transition-colors cursor-pointer"
              title="Copy all headers to clipboard"
            >
              {copiedAll ? (
                <>
                  <Check size={11} className="text-emerald-400" />
                  <span className="text-emerald-400">All Copied</span>
                </>
              ) : (
                <>
                  <Copy size={11} className="text-slate-400" />
                  <span>Copy All</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter headers..."
            className="h-7 pl-7 pr-3 bg-[#111318] border border-[#2b313e] rounded text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 w-44"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-[#232732] rounded-md bg-[#111318]">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-[#232732] bg-[#14171f] text-[11px] font-semibold text-slate-400">
              <th className="w-1/3 px-3 py-2">HEADER</th>
              <th className="px-3 py-2">VALUE</th>
              <th className="w-16 px-3 py-2 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2330]">
            {headerEntries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                  {Object.keys(headers || {}).length === 0
                    ? 'No headers returned'
                    : 'No headers matching filter'}
                </td>
              </tr>
            ) : (
              headerEntries.map(([key, value]) => {
                const isValCopied = copiedKey === `${key}-val`;
                const isFullCopied = copiedKey === `${key}-full`;

                return (
                  <tr key={key} className="group hover:bg-[#181b22] transition-colors">
                    <td className="px-3 py-1.5 font-semibold text-slate-300 select-all align-top">
                      {key}
                    </td>
                    <td className="px-3 py-1.5 text-slate-400 break-all select-all align-top">
                      {String(value)}
                    </td>
                    <td className="px-3 py-1.5 text-right align-top shrink-0">
                      <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopyValue(key, value)}
                          title="Copy value only"
                          className="px-1.5 py-0.5 rounded bg-[#232732] hover:bg-[#2e3444] text-[10px] text-slate-300 transition-colors"
                        >
                          {isValCopied ? <Check size={10} className="text-emerald-400" /> : 'Val'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyEntry(key, value)}
                          title="Copy 'Name: Value'"
                          className="p-1 rounded bg-[#232732] hover:bg-[#2e3444] text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          {isFullCopied ? (
                            <Check size={11} className="text-emerald-400" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
