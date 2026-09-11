import { useMemo } from 'react';
import { Cookie } from 'lucide-react';
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
  const cookies = useMemo(() => parseCookies(headers), [headers]);

  return (
    <div className={cn('flex-1 flex flex-col min-h-0 p-4 space-y-3', className)}>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Response Cookies ({cookies.length})
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2330]">
              {cookies.map((c, i) => (
                <tr key={i} className="hover:bg-[#181b22] transition-colors">
                  <td className="px-3 py-1.5 font-semibold text-slate-300 select-all">{c.name}</td>
                  <td className="px-3 py-1.5 text-slate-400 max-w-xs truncate select-all">{c.value}</td>
                  <td className="px-3 py-1.5 text-slate-500">{c.domain}</td>
                  <td className="px-3 py-1.5 text-slate-500">{c.path}</td>
                  <td className="px-3 py-1.5 text-slate-400">{c.secure ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-1.5 text-slate-400">{c.httpOnly ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

