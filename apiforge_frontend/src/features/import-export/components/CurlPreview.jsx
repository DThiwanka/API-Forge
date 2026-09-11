import { useMemo } from 'react';
import { cn } from '../../../utils/cn';
import { Key, FileText, Lock, Settings2, HelpCircle } from 'lucide-react';

const METHOD_STYLES = {
  GET: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
  POST: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
  PUT: 'text-blue-400 bg-blue-950/40 border-blue-800/50',
  PATCH: 'text-purple-400 bg-purple-950/40 border-purple-800/50',
  DELETE: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
  HEAD: 'text-teal-400 bg-teal-950/40 border-teal-800/50',
  OPTIONS: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/50',
};

export default function CurlPreview({ parsedRequest, className }) {
  const {
    method = 'GET',
    url = '',
    queryParams = [],
    headers = [],
    auth = { type: 'none' },
    body = { mode: 'none' },
    settings = {},
  } = parsedRequest || {};

  const activeParams = useMemo(
    () => (queryParams || []).filter((p) => p.key || p.value),
    [queryParams]
  );

  const activeHeaders = useMemo(
    () => (headers || []).filter((h) => h.key || h.value),
    [headers]
  );

  const formattedBody = useMemo(() => {
    if (!body || body.mode === 'none') return null;
    if (body.mode === 'json' && body.raw) {
      try {
        const parsed = JSON.parse(body.raw);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return body.raw;
      }
    }
    if (body.mode === 'x-www-form-urlencoded' && body.urlencoded) {
      return body.urlencoded
        .map((item) => `${item.key}=${item.value}`)
        .join('\n');
    }
    return body.raw || null;
  }, [body]);

  if (!parsedRequest) return null;

  const methodBadgeStyle =
    METHOD_STYLES[method.toUpperCase()] ||
    'text-slate-300 bg-slate-800/40 border-slate-700/50';

  return (
    <div
      className={cn(
        'rounded-md bg-[#111318] border border-[#232732] overflow-hidden text-xs',
        className
      )}
    >
      {/* 1. Request Method & URL Header */}
      <div className="p-3 bg-[#14171f] border-b border-[#232732] flex items-start gap-2.5">
        <span
          className={cn(
            'px-2 py-0.5 rounded font-mono font-bold text-[11px] border shrink-0 uppercase tracking-wider',
            methodBadgeStyle
          )}
        >
          {method}
        </span>
        <div className="flex-1 min-w-0 font-mono text-slate-200 text-xs break-all select-all pt-0.5">
          {url || '<no URL specified>'}
        </div>
      </div>

      <div className="p-3 space-y-3 max-h-[360px] overflow-y-auto">
        {/* 2. Query Parameters Section */}
        {activeParams.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1.5 text-[11px]">
              <HelpCircle size={12} className="text-sky-400" />
              <span>Query Parameters ({activeParams.length})</span>
            </div>
            <div className="rounded border border-[#232732] bg-[#0d0f14] overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-[#232732] bg-[#14171f] text-slate-400">
                    <th className="px-2.5 py-1 font-semibold w-1/3">Key</th>
                    <th className="px-2.5 py-1 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2330]">
                  {activeParams.map((param, index) => (
                    <tr key={`${param.key}-${index}`} className="hover:bg-[#14171f]/50">
                      <td className="px-2.5 py-1 text-slate-300 break-all">{param.key}</td>
                      <td className="px-2.5 py-1 text-sky-400 break-all">{param.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Headers Section */}
        {activeHeaders.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1.5 text-[11px]">
              <Key size={12} className="text-amber-400" />
              <span>Headers ({activeHeaders.length})</span>
            </div>
            <div className="rounded border border-[#232732] bg-[#0d0f14] overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-[#232732] bg-[#14171f] text-slate-400">
                    <th className="px-2.5 py-1 font-semibold w-1/3">Header</th>
                    <th className="px-2.5 py-1 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2330]">
                  {activeHeaders.map((header, index) => (
                    <tr key={`${header.key}-${index}`} className="hover:bg-[#14171f]/50">
                      <td className="px-2.5 py-1 text-slate-300 break-all">{header.key}</td>
                      <td className="px-2.5 py-1 text-emerald-400 break-all">{header.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Authentication Section */}
        {auth?.type && auth.type !== 'none' && (
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1.5 text-[11px]">
              <Lock size={12} className="text-purple-400" />
              <span>Authentication</span>
            </div>
            <div className="rounded border border-[#232732] bg-[#0d0f14] p-2.5 font-mono text-[11px] space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 uppercase text-[10px]">Type:</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-950/40 border border-purple-800/40 text-purple-300 text-[10px] font-semibold uppercase">
                  {auth.type}
                </span>
              </div>
              {auth.type === 'bearer' && (
                <div className="text-slate-400 truncate">
                  <span className="text-slate-500">Token: </span>
                  <span className="text-slate-300 font-mono">
                    {auth.bearer?.token
                      ? `${auth.bearer.token.slice(0, 8)}••••••••`
                      : '<empty>'}
                  </span>
                </div>
              )}
              {auth.type === 'basic' && (
                <div className="space-y-0.5">
                  <div className="text-slate-400">
                    <span className="text-slate-500">User: </span>
                    <span className="text-slate-300">{auth.basic?.username || '<none>'}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500">Pass: </span>
                    <span className="text-slate-300">••••••••</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Request Body Section */}
        {body?.mode && body.mode !== 'none' && formattedBody && (
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <FileText size={12} className="text-sky-400" />
                <span>Request Body</span>
              </div>
              <span className="px-1.5 py-0.2 rounded bg-[#181b22] border border-[#2b313e] text-[10px] font-mono uppercase text-sky-400">
                {body.mode}
              </span>
            </div>
            <pre className="p-2.5 rounded border border-[#232732] bg-[#0d0f14] font-mono text-[11px] text-slate-200 overflow-x-auto max-h-40 whitespace-pre leading-relaxed select-all">
              {formattedBody}
            </pre>
          </div>
        )}

        {/* 6. Settings Preview (if non-default) */}
        {(settings?.timeoutMs || settings?.followRedirects !== undefined) && (
          <div className="flex items-center gap-2 pt-1 border-t border-[#232732]/60 text-[10px] font-mono text-slate-400">
            <Settings2 size={11} className="text-slate-500" />
            <span>Settings:</span>
            {settings?.timeoutMs && (
              <span className="px-1.5 py-0.2 rounded bg-[#181b22] border border-[#2b313e] text-slate-300">
                Timeout: {settings.timeoutMs}ms
              </span>
            )}
            {settings?.followRedirects !== undefined && (
              <span className="px-1.5 py-0.2 rounded bg-[#181b22] border border-[#2b313e] text-slate-300">
                Redirects: {settings.followRedirects ? 'Follow' : 'Manual'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
