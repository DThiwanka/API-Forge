import { useState, useMemo, useEffect } from 'react';
import { X, Copy, Check, Shield, Eye, Lock } from 'lucide-react';
import { getMethodConfig } from '../utils/requestMethods';
import { maskSensitiveHeaderValue, buildQueryString, splitUrl } from '../utils/urlUtils';
import VariableToken from './VariableToken';
import { cn } from '../../../utils/cn';

export default function RequestPreviewModal({
  isOpen,
  onClose,
  name,
  method = 'GET',
  url = '',
  queryParams = [],
  headers = [],
  auth = { type: 'none' },
  body = { mode: 'none' },
  allReferencedVariables = [],
  knownVariableKeys = new Set(),
  activeEnvName,
  getVariable,
}) {
  const [copiedType, setCopiedType] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const methodConfig = useMemo(() => getMethodConfig(method), [method]);

  // Compute full composed URL with enabled query params
  const fullComposedUrl = useMemo(() => {
    const { baseUrl, hash } = splitUrl(url);
    const qs = buildQueryString(queryParams);

    // If API Key is configured in query params, include masked key
    let finalQs = qs;
    if (auth.type === 'api-key' && auth.apiKey?.addTo === 'query' && auth.apiKey?.key?.trim()) {
      const apiKeyParam = `${auth.apiKey.key}=••••••••`;
      finalQs = finalQs ? `${finalQs}&${apiKeyParam}` : apiKeyParam;
    }

    const hashPart = hash ? `#${hash}` : '';
    if (!finalQs) return `${baseUrl || url}${hashPart}`;
    return `${baseUrl || url}?${finalQs}${hashPart}`;
  }, [url, queryParams, auth]);

  // Compute all effective headers with sensitive values masked
  const effectiveHeaders = useMemo(() => {
    const list = [];

    // Custom headers
    for (const h of headers || []) {
      if (h.enabled !== false && h.key?.trim()) {
        list.push({
          key: h.key.trim(),
          value: maskSensitiveHeaderValue(h.key, h.value),
          source: 'custom',
        });
      }
    }

    // Computed auth header
    if (auth.type === 'bearer' && auth.bearer?.token?.trim()) {
      list.push({
        key: 'Authorization',
        value: 'Bearer ••••••••',
        source: 'auth',
      });
    } else if (auth.type === 'basic' && (auth.basic?.username || auth.basic?.password)) {
      list.push({
        key: 'Authorization',
        value: 'Basic ••••••••',
        source: 'auth',
      });
    } else if (auth.type === 'api-key' && auth.apiKey?.addTo !== 'query' && auth.apiKey?.key?.trim()) {
      list.push({
        key: auth.apiKey.key.trim(),
        value: '••••••••',
        source: 'auth',
      });
    }

    return list;
  }, [headers, auth]);

  // Generate masked cURL command
  const maskedCurl = useMemo(() => {
    const parts = [`curl -X ${method.toUpperCase()} "${fullComposedUrl}"`];

    for (const h of effectiveHeaders) {
      parts.push(`  -H "${h.key}: ${h.value}"`);
    }

    if (body.mode === 'json' && body.raw) {
      parts.push(`  -d '${body.raw.replace(/'/g, "\\'")}'`);
    } else if (body.mode === 'x-www-form-urlencoded' && Array.isArray(body.urlencoded)) {
      const formFields = body.urlencoded
        .filter((u) => u.enabled !== false && (u.key?.trim() || u.value?.trim()))
        .map((u) => `--data-urlencode "${u.key}=${u.value}"`);
      if (formFields.length > 0) {
        parts.push(`  ${formFields.join(' \\\n  ')}`);
      }
    } else if ((body.mode === 'text' || body.mode === 'raw') && body.raw) {
      parts.push(`  -d '${body.raw.replace(/'/g, "\\'")}'`);
    }

    return parts.join(' \\\n');
  }, [method, fullComposedUrl, effectiveHeaders, body]);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#111318] border border-[#2b313e] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#232732] flex items-center justify-between bg-[#14171f]">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-sky-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Composed Request Preview</span>
                <span className="text-xs font-normal text-slate-400 font-mono">({name})</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Safe read-only preview of outbound HTTP request before execution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(maskedCurl, 'curl')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1c212c] hover:bg-[#252c3b] border border-[#2b313e] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              {copiedType === 'curl' ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-300">Copied cURL!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy cURL</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#1f2430] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans text-xs">
          {/* Method & URL Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold uppercase tracking-wider">Target Endpoint</span>
              <button
                type="button"
                onClick={() => handleCopy(fullComposedUrl, 'url')}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedType === 'url' ? <Check size={11} /> : <Copy size={11} />}
                <span>{copiedType === 'url' ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-[#0a0c10] border border-[#232732] rounded-md font-mono text-xs overflow-x-auto">
              <span className={cn('px-2 py-0.5 rounded text-[11px] font-bold shrink-0', methodConfig.badge, methodConfig.color)}>
                {method}
              </span>
              <span className="text-slate-200 break-all select-all">{fullComposedUrl || '(No URL configured)'}</span>
            </div>
          </div>

          {/* Composed Headers */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold uppercase tracking-wider">
                Headers ({effectiveHeaders.length})
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                Sensitive credentials masked with ••••••••
              </span>
            </div>

            {effectiveHeaders.length === 0 ? (
              <div className="p-3 text-center text-slate-500 bg-[#0a0c10] border border-[#232732] rounded-md text-xs">
                No headers configured.
              </div>
            ) : (
              <div className="border border-[#232732] rounded-md overflow-hidden bg-[#0a0c10]">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <tbody className="divide-y divide-[#1e2330]">
                    {effectiveHeaders.map((h, i) => (
                      <tr key={i} className="hover:bg-[#121620]/50">
                        <td className="px-3 py-1.5 font-semibold text-slate-300 w-1/3 border-r border-[#1e2330]">
                          <span className="flex items-center gap-1.5">
                            {h.source === 'auth' && <Lock size={11} className="text-sky-400" />}
                            <span>{h.key}</span>
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-slate-400 break-all select-all">
                          {h.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Request Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold uppercase tracking-wider">
                Body Mode: <span className="text-sky-300 uppercase">{body.mode || 'none'}</span>
              </span>
            </div>

            {body.mode === 'none' ? (
              <div className="p-3 text-center text-slate-500 bg-[#0a0c10] border border-[#232732] rounded-md text-xs">
                No request body will be sent.
              </div>
            ) : body.mode === 'x-www-form-urlencoded' ? (
              <div className="border border-[#232732] rounded-md overflow-hidden bg-[#0a0c10]">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e2330] bg-[#12151d] text-[10px] text-slate-400">
                      <th className="px-3 py-1">KEY</th>
                      <th className="px-3 py-1">VALUE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2330]">
                    {(body.urlencoded || [])
                      .filter((u) => u.enabled !== false && (u.key?.trim() || u.value?.trim()))
                      .map((u, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-semibold text-slate-300 w-1/3 border-r border-[#1e2330]">
                            {u.key}
                          </td>
                          <td className="px-3 py-1.5 text-slate-400 break-all select-all">
                            {u.value}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 bg-[#0a0c10] border border-[#232732] rounded-md font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto select-all">
                {body.raw || '(Empty body)'}
              </div>
            )}
          </div>

          {/* Referenced Variables */}
          {allReferencedVariables.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-semibold uppercase tracking-wider">
                  Referenced Template Variables ({allReferencedVariables.length})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Environment: {activeEnvName || 'None'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap p-2.5 bg-[#0a0c10] border border-[#232732] rounded-md">
                {allReferencedVariables.map((v) => {
                  const meta = getVariable?.(v);
                  const isKnown = knownVariableKeys?.has?.(v);
                  return (
                    <VariableToken
                      key={v}
                      name={v}
                      isKnown={isKnown}
                      source={meta?.source || 'environment'}
                      isSecret={meta?.isSecret}
                      previewValue={meta?.value}
                      envName={meta?.envName || activeEnvName}
                      description={meta?.description}
                      className="py-0.5 text-xs"
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#232732] flex items-center justify-between bg-[#14171f] text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Shield size={13} className="text-sky-400" />
            <span>Confidential Safe Mode — Secret values are never exposed in previews or serialized summaries.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#1f2430] hover:bg-[#2b3345] text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
