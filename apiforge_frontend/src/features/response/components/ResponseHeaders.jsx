import { useState, useMemo } from 'react';
import { Copy, Check, Search } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function ResponseHeaders({ headers = {}, className }) {
  const [filter, setFilter] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

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

  const handleCopy = (key, value) => {
    navigator.clipboard.writeText(`${key}: ${value}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className={cn('flex-1 flex flex-col min-h-0 p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Response Headers ({Object.keys(headers || {}).length})
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2 top-2 text-slate-500" />
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
              <th className="w-10 px-3 py-2 text-center"></th>
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
              headerEntries.map(([key, value]) => (
                <tr key={key} className="group hover:bg-[#181b22] transition-colors">
                  <td className="px-3 py-1.5 font-semibold text-slate-300 select-all align-top">
                    {key}
                  </td>
                  <td className="px-3 py-1.5 text-slate-400 break-all select-all align-top">
                    {String(value)}
                  </td>
                  <td className="px-3 py-1.5 text-center align-top">
                    <button
                      type="button"
                      onClick={() => handleCopy(key, value)}
                      title="Copy header"
                      className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      {copiedKey === key ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

