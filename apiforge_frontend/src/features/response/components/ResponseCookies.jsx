import { useState, useMemo } from 'react';
import { Cookie, Copy, Check, Search } from 'lucide-react';
import { cn } from '../../../utils/cn';

function parseCookies(headers = {}) {
  const cookieHeaders = [];
  for (const [key, val] of Object.entries(headers)) {
    if (key.toLowerCase() === 'set-cookie') {
      if (Array.isArray(val)) {
        cookieHeaders.push(...val);
      } else if (typeof val === 'string') {
        cookieHeaders.push(val);
      }
    }
  }

  return cookieHeaders.map((cookieStr) => {
    const parts = cookieStr.split(';').map((p) => p.trim());
    const [nameVal, ...attributes] = parts;
    const [name, ...valParts] = nameVal.split('=');
    const value = valParts.join('=');

    const attrMap = {};
    for (const attr of attributes) {
      const [k, v] = attr.split('=');
      attrMap[k.toLowerCase()] = v || true;
    }

    return {
      name,
      value,
      domain: attrMap.domain || '-',
      path: attrMap.path || '/',
      expires: attrMap.expires || attrMap['max-age'] || '-',
      httpOnly: Boolean(attrMap.httponly),
      secure: Boolean(attrMap.secure),
      sameSite: attrMap.samesite || '-',
    };
  });
}

export default function ResponseCookies({ headers = {}, className }) {
  const [filter, setFilter] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const cookies = useMemo(() => parseCookies(headers), [headers]);

  const filteredCookies = useMemo(() => {
    if (!filter.trim()) return cookies;
    const lower = filter.toLowerCase();
    return cookies.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.value.toLowerCase().includes(lower) ||
        c.domain.toLowerCase().includes(lower)
    );
  }, [cookies, filter]);

  const handleCopy = (value, idx) => {
    navigator.clipboard.writeText(value);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className={cn('flex-1 flex flex-col min-h-0 p-4 space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Response Cookies ({cookies.length})
        </span>

        {cookies.length > 0 && (
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter cookies..."
              className="h-7 pl-7 pr-3 bg-[#111318] border border-[#2b313e] rounded text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 w-44"
            />
          </div>
        )}
      </div>

      {cookies.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500 font-mono text-xs border border-dashed border-[#232732] rounded-md">
          <Cookie size={24} className="mb-2 opacity-40 text-slate-400" />
          <span>No cookies returned by server</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto border border-[#232732] rounded-md bg-[#111318]">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#232732] bg-[#14171f] text-[11px] font-semibold text-slate-400">
                <th className="px-3 py-2">NAME</th>
                <th className="px-3 py-2">VALUE</th>
                <th className="px-3 py-2">DOMAIN</th>
                <th className="px-3 py-2">PATH</th>
                <th className="px-3 py-2">SECURE</th>
                <th className="px-3 py-2">HTTPONLY</th>
                <th className="w-10 px-3 py-2 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2330]">
              {filteredCookies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No cookies matching filter
                  </td>
                </tr>
              ) : (
                filteredCookies.map((c, i) => (
                  <tr key={i} className="group hover:bg-[#181b22] transition-colors">
                    <td className="px-3 py-1.5 font-semibold text-slate-300 select-all align-top">
                      {c.name}
                    </td>
                    <td className="px-3 py-1.5 text-slate-400 max-w-xs truncate select-all align-top">
                      {c.value}
                    </td>
                    <td className="px-3 py-1.5 text-slate-500 align-top">{c.domain}</td>
                    <td className="px-3 py-1.5 text-slate-500 align-top">{c.path}</td>
                    <td className="px-3 py-1.5 text-slate-400 align-top">
                      {c.secure ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-medium">
                          Secure
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-slate-400 align-top">
                      {c.httpOnly ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-950/60 border border-sky-800 text-sky-300 font-medium">
                          HttpOnly
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center align-top">
                      <button
                        type="button"
                        onClick={() => handleCopy(c.value, i)}
                        title="Copy cookie value"
                        className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                        {copiedIndex === i ? (
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
      )}
    </div>
  );
}
