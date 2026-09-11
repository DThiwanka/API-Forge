import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Copy,
  Check,
  Clock,
  HardDrive,
  Calendar,
  AlertTriangle,
  Globe,
  FileCode,
} from 'lucide-react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import {
  METHOD_STYLES,
  getStatusBadge,
  formatDuration,
  formatBytes,
} from '../utils/historyHelpers';
import { cn } from '../../../utils/cn';

export default function HistoryDetailModal({ isOpen, onClose, item }) {
  const navigate = useNavigate();
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!item) return null;

  const statusInfo = getStatusBadge(item.status, item.errorType);
  const methodStyle = METHOD_STYLES[item.method] || 'text-slate-400 bg-slate-800/40 border-slate-700/40';
  const hasRequest = Boolean(item.requestId && item.request?.name);

  const handleCopyUrl = async () => {
    if (item.url) {
      await navigator.clipboard.writeText(item.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleOpenInEditor = () => {
    onClose();
    if (hasRequest && item.collectionId) {
      navigate(
        `/workspace/${item.workspaceId}/collections/${item.collectionId}/requests/${item.requestId}`
      );
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Execution Details"
      className="max-w-2xl bg-[#11141c] border border-[#262c3b] text-slate-200"
    >
      <div className="flex flex-col gap-4 text-xs">
        {/* Header summary: Method, Status, Request Name */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#0d0f15] border border-[#1f2430]">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2.5 py-0.5 rounded text-xs font-mono font-bold border tracking-wider uppercase',
                methodStyle
              )}
            >
              {item.method}
            </span>
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-mono font-semibold border',
                statusInfo.color
              )}
            >
              {statusInfo.label} {item.statusText ? `• ${item.statusText}` : ''}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Calendar size={12} className="text-slate-500" />
            <span>{new Date(item.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Executed URL */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 mb-1 block">
            Executed Target URL
          </label>
          <div className="flex items-center gap-2 bg-[#0a0c10] border border-[#1f2430] rounded-md p-2 font-mono text-[11px] text-slate-200 break-all">
            <span className="flex-1">{item.url}</span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-[#1a1f2c] transition-colors shrink-0"
              title="Copy URL"
            >
              {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Request Definition & Environment metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-2.5 rounded bg-[#0d0f15] border border-[#1f2430]">
            <div className="text-[11px] text-slate-500 font-medium mb-1 flex items-center gap-1">
              <FileCode size={12} />
              <span>Saved Request</span>
            </div>
            <div className="font-semibold text-slate-200 truncate">
              {item.request?.name || 'Ad-hoc / Unnamed'}
            </div>
            {!hasRequest && (
              <div className="text-[10px] text-slate-500 mt-0.5">
                Original request definition is not available
              </div>
            )}
          </div>

          <div className="p-2.5 rounded bg-[#0d0f15] border border-[#1f2430]">
            <div className="text-[11px] text-slate-500 font-medium mb-1 flex items-center gap-1">
              <Globe size={12} />
              <span>Workspace Environment</span>
            </div>
            <div className="font-semibold text-slate-200 truncate">
              {item.environment?.name || 'No Environment'}
            </div>
          </div>
        </div>

        {/* Performance & Metrics grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-[#0d0f15] border border-[#1f2430]">
            <div className="text-[10px] text-slate-500 font-mono uppercase mb-0.5 flex items-center justify-center gap-1">
              <Clock size={11} /> Duration
            </div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {formatDuration(item.duration)}
            </div>
          </div>

          <div className="p-2 rounded bg-[#0d0f15] border border-[#1f2430]">
            <div className="text-[10px] text-slate-500 font-mono uppercase mb-0.5 flex items-center justify-center gap-1">
              <HardDrive size={11} /> Response Size
            </div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {formatBytes(item.responseSize)}
            </div>
          </div>

          <div className="p-2 rounded bg-[#0d0f15] border border-[#1f2430]">
            <div className="text-[10px] text-slate-500 font-mono uppercase mb-0.5">
              Content Type
            </div>
            <div className="text-xs font-mono font-semibold text-slate-200 truncate" title={item.contentType || 'none'}>
              {item.contentType || '--'}
            </div>
          </div>
        </div>

        {/* Failure diagnostics if execution failed */}
        {(item.errorType || item.errorMessage) && (
          <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 text-rose-300">
            <div className="flex items-center gap-1.5 font-semibold text-xs mb-1 text-rose-400">
              <AlertTriangle size={13} />
              <span>Failure Classification: {item.errorType || 'ERROR'}</span>
            </div>
            {item.errorMessage && (
              <div className="font-mono text-[11px] text-rose-200/90 break-words mt-1">
                {item.errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1f2430] mt-2">
          {hasRequest ? (
            <Button
              variant="secondary"
              onClick={handleOpenInEditor}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 border-sky-800/40"
            >
              <ExternalLink size={13} />
              <span>Open in Request Workspace</span>
            </Button>
          ) : (
            <div />
          )}

          <Button variant="secondary" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

