import { memo, useState } from 'react';
import {
  Compass,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldAlert,
  Code2,
  BookOpen,
  RefreshCw,
  Home,
  Info,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

const DEVELOPER_SHORTCUTS = [
  {
    title: 'HTTPBin',
    desc: 'HTTP Request & Response Service',
    url: 'https://httpbin.org/get',
    icon: Code2,
    badge: 'API Testing',
  },
  {
    title: 'JSONPlaceholder',
    desc: 'Fake REST API for Prototyping',
    url: 'https://jsonplaceholder.typicode.com/posts',
    icon: Code2,
    badge: 'Mock REST',
  },
  {
    title: 'Swagger Petstore',
    desc: 'Sample OpenAPI 2.0 / 3.0 API Definition',
    url: 'https://petstore.swagger.io/v2/swagger.json',
    icon: BookOpen,
    badge: 'OpenAPI Spec',
  },
  {
    title: 'MDN Web Docs',
    desc: 'HTTP & Web API Reference Documentation',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP',
    icon: BookOpen,
    badge: 'Documentation',
  },
  {
    title: 'GitHub REST API',
    desc: 'Root API surface for GitHub',
    url: 'https://api.github.com',
    icon: Code2,
    badge: 'Public API',
  },
  {
    title: 'Rick & Morty API',
    desc: 'GraphQL & REST Developer Portal',
    url: 'https://rickandmortyapi.com/api',
    icon: Compass,
    badge: 'REST Sample',
  },
];

function BrowserViewportComponent({
  tab,
  isLoading = false,
  error,
  onNavigate,
  onClearError,
  onOpenInApiClient,
}) {
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'headers'

  // If there is an active navigation error
  if (error) {
    const isSsrfBlocked = error.code === 'BLOCKED_BROWSER_URL';

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#090a0f] select-none text-center">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#111318] border border-[#232732] shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#181b22] border border-[#2b313e] flex items-center justify-center mx-auto text-rose-400 shadow-md">
            {isSsrfBlocked ? <ShieldAlert size={22} /> : <AlertTriangle size={22} />}
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-100">
              {isSsrfBlocked ? 'Destination Blocked by Security Policy' : 'Navigation Failed'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {error.message || 'Unable to complete navigation to the specified URL.'}
            </p>
          </div>

          {isSsrfBlocked && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-[11px] text-amber-300 text-left space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <Info size={12} />
                <span>SSRF Protection Active</span>
              </div>
              <p className="text-[10px] text-amber-300/80 leading-snug">
                For security, APIForge Browser Space restricts navigation to localhost, loopback addresses (127.0.0.1), private RFC1918 networks, and cloud metadata endpoints.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClearError}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <Home size={13} />
              <span>Back to New Tab</span>
            </button>

            {tab?.url && (
              <button
                type="button"
                onClick={() => onNavigate(tab.url)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading && (!tab || !tab.url)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#090a0f] select-none text-center">
        <Loader2 size={24} className="animate-spin text-sky-400 mb-2" />
        <span className="text-xs font-mono text-slate-400">Loading page in isolated browser context...</span>
      </div>
    );
  }

  // New Tab State (Empty URL)
  if (!tab || !tab.url) {
    return (
      <div className="flex-1 overflow-y-auto p-8 bg-[#090a0f] select-none">
        <div className="max-w-2xl mx-auto space-y-6 pt-4">
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#141722] border border-[#262c3b] text-sky-400 shadow-xl mb-1">
              <Compass size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
              APIForge Browser Space
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              An isolated developer browser embedded in your workspace. Inspect API documentation, explore public endpoints, and test web resources securely.
            </p>
          </div>

          {/* Quick Developer Resources Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 px-1">
              <span>Quick Developer Endpoints</span>
              <span>Click to open</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEVELOPER_SHORTCUTS.map((sc) => {
                const Icon = sc.icon;
                return (
                  <button
                    key={sc.url}
                    type="button"
                    onClick={() => onNavigate(sc.url)}
                    className="flex flex-col text-left p-3 rounded-xl bg-[#111318] hover:bg-[#161922] border border-[#232732] hover:border-sky-500/50 transition-all duration-150 group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon size={13} className="text-sky-400" />
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                          {sc.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#181b24] border border-[#2b313e] text-slate-400">
                        {sc.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mb-1.5">
                      {sc.desc}
                    </p>
                    <span className="text-[10px] font-mono text-slate-500 truncate group-hover:text-slate-400">
                      {sc.url}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loaded State
  const status = tab.lastStatus || 200;
  const is2xx = status >= 200 && status < 300;
  const is3xx = status >= 300 && status < 400;
  const is4xx = status >= 400 && status < 500;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090a0f] overflow-hidden select-text">
      {/* Viewport Inspector Topbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12141c] border-b border-[#212634] text-xs select-none">
        <div className="flex items-center gap-2 min-w-0">
          {/* Status Badge */}
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border',
              is2xx
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                : is3xx
                ? 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                : is4xx
                ? 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            )}
          >
            {status}
          </span>

          <span className="text-xs font-semibold text-slate-200 truncate max-w-xs" title={tab.title}>
            {tab.title || tab.url}
          </span>

          <span className="hidden sm:inline text-[10px] font-mono text-slate-500 truncate max-w-sm">
            {tab.url}
          </span>
        </div>

        {/* View Switcher: Rendered Preview vs Response Headers */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center p-0.5 rounded-md bg-[#0d0f14] border border-[#232732]">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer',
                viewMode === 'preview'
                  ? 'bg-[#181b22] text-sky-400 border border-[#2b313e]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Preview
            </button>

            <button
              type="button"
              onClick={() => setViewMode('headers')}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer',
                viewMode === 'headers'
                  ? 'bg-[#181b22] text-sky-400 border border-[#2b313e]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Headers ({Object.keys(tab.headers || {}).length})
            </button>
          </div>

          {onOpenInApiClient && tab.url && (
            <button
              type="button"
              onClick={() => onOpenInApiClient(tab)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#181b24] border border-[#2b313e] hover:border-sky-500/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Open in API Client"
            >
              <Code2 size={11} className="text-sky-400" />
              <span>API Client</span>
            </button>
          )}

          <a
            href={tab.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#181b22] transition-colors"
            title="Open in external browser window"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Viewport Content */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {viewMode === 'preview' ? (
          <iframe
            key={tab.url}
            srcDoc={tab.previewContent || `<html><body style="font-family:sans-serif;padding:20px;color:#333;"><h2>${tab.title || 'Page Loaded'}</h2><p><a href="${tab.url}">${tab.url}</a></p></body></html>`}
            sandbox="allow-same-origin allow-forms"
            title={tab.title || 'Browser Viewport'}
            className="w-full h-full border-0 bg-white"
          />
        ) : (
          <div className="w-full h-full p-4 bg-[#090a0f] text-slate-200 overflow-y-auto font-mono text-xs space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              HTTP Response Headers
            </div>
            {Object.entries(tab.headers || {}).map(([key, val]) => (
              <div key={key} className="flex gap-2 py-1 border-b border-[#1c202c]">
                <span className="text-sky-400 font-semibold shrink-0 min-w-[160px]">{key}:</span>
                <span className="text-slate-300 break-all">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const BrowserViewport = memo(BrowserViewportComponent);
export default BrowserViewport;
