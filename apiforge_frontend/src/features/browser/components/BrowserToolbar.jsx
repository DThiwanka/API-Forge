import { memo } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, ShieldCheck, RefreshCw, Code2, Activity } from 'lucide-react';
import BrowserAddressBar from './BrowserAddressBar';
import { cn } from '../../../utils/cn';
import { useBrowserStore } from '../store/browserStore';

function BrowserToolbarComponent({
  activeTab,
  addressBarValue,
  onAddressBarChange,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onCloseSession,
  onOpenInApiClient,
  isLoading = false,
}) {
  const canGoBack = Boolean(activeTab?.canGoBack);
  const canGoForward = Boolean(activeTab?.canGoForward);
  const isNetworkPanelOpen = useBrowserStore((s) => s.isNetworkPanelOpen);
  const toggleNetworkPanel = useBrowserStore((s) => s.toggleNetworkPanel);

  return (
    <div className="flex items-center gap-2 h-10 px-3 bg-[#111318] border-b border-[#232732] select-none text-xs">
      {/* Navigation Controls: Back, Forward, Reload */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || isLoading}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            canGoBack && !isLoading
              ? 'text-slate-300 hover:text-white hover:bg-[#1c202c] cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          )}
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft size={14} />
        </button>

        <button
          type="button"
          onClick={onForward}
          disabled={!canGoForward || isLoading}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            canGoForward && !isLoading
              ? 'text-slate-300 hover:text-white hover:bg-[#1c202c] cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          )}
          title="Forward"
          aria-label="Forward"
        >
          <ArrowRight size={14} />
        </button>

        <button
          type="button"
          onClick={onReload}
          disabled={isLoading || !activeTab?.url}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            activeTab?.url && !isLoading
              ? 'text-slate-300 hover:text-white hover:bg-[#1c202c] cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          )}
          title="Reload Page"
          aria-label="Reload"
        >
          <RotateCw size={14} className={isLoading ? 'animate-spin text-sky-400' : ''} />
        </button>
      </div>

      {/* Address Bar */}
      <BrowserAddressBar
        value={addressBarValue}
        onChange={onAddressBarChange}
        onNavigate={onNavigate}
        isLoading={isLoading}
      />

      {/* Isolated Context Badge & Session Action */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <button
          type="button"
          onClick={toggleNetworkPanel}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all cursor-pointer text-xs shrink-0',
            isNetworkPanelOpen
              ? 'bg-sky-950/50 border-sky-800/60 text-sky-300 hover:bg-sky-950/70'
              : 'bg-[#181b24] border-[#2b313e] hover:border-slate-600 text-slate-400 hover:text-slate-200'
          )}
          title="Toggle live browser network activity panel"
        >
          <Activity size={13} className={isNetworkPanelOpen ? 'text-sky-400' : 'text-slate-400'} />
          <span className="font-medium text-[11px]">Network</span>
        </button>

        {activeTab?.url && onOpenInApiClient && (
          <button
            type="button"
            onClick={onOpenInApiClient}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181b24] border border-[#2b313e] hover:border-sky-500/60 text-slate-200 hover:text-white transition-all cursor-pointer text-xs shrink-0 shadow-xs group"
            title="Create or open API request from current browser URL"
          >
            <Code2 size={13} className="text-sky-400 group-hover:text-sky-300" />
            <span className="font-medium text-[11px]">Open in API Client</span>
          </button>
        )}

        <div
          className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[10px] font-mono text-emerald-300"
          title="Isolated browser context per workspace. No cookie or secret leakage."
        >
          <ShieldCheck size={11} className="text-emerald-400 shrink-0" />
          <span>Isolated Session</span>
        </div>

        {onCloseSession && (
          <button
            type="button"
            onClick={onCloseSession}
            className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-[#181b22] transition-colors cursor-pointer"
            title="Reset browser session"
            aria-label="Reset Session"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export const BrowserToolbar = memo(BrowserToolbarComponent);
export default BrowserToolbar;

