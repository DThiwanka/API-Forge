import { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import { exportRequestAsCurl } from '../services/importExportApi';
import {
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Terminal,
} from 'lucide-react';

export default function CurlExport({
  workspaceId,
  requestId,
  onClose,
}) {
  const [command, setCommand] = useState('');
  const [hasSecrets, setHasSecrets] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchExport() {
      if (!workspaceId || !requestId) return;

      setIsLoading(true);
      setError(null);
      setCommand('');
      setHasSecrets(false);
      setIsCopied(false);

      try {
        const data = await exportRequestAsCurl(workspaceId, requestId);
        if (isMounted) {
          setCommand(data.command || '');
          setHasSecrets(Boolean(data.hasSecrets));
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err.response?.data?.message ||
            err.message ||
            'Failed to export request as cURL';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchExport();

    return () => {
      isMounted = false;
    };
  }, [workspaceId, requestId]);

  const handleCopy = async () => {
    if (!command) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(command);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = command;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      setError('Could not automatically copy to clipboard. Please copy manually from the box below.');
    }
  };

  if (!requestId) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        Please open a request in the Request Workspace to export it as a cURL command.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-400 -mt-2">
        Export this request as a standard, executable cURL command compatible with bash, zsh, and terminal environments.
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 size={24} className="animate-spin text-sky-400" />
          <span className="text-xs font-mono">Generating cURL command...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 rounded bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 break-words">{error}</div>
        </div>
      )}

      {/* Success / Display State */}
      {!isLoading && !error && command && (
        <div className="space-y-3">
          {/* Sensitive Data Warning */}
          {hasSecrets && (
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Sensitive Credentials Notice:</span>{' '}
                This command contains authorization tokens or active environment variable references. Verify the contents before sharing.
              </div>
            </div>
          )}

          {/* Generated cURL Display Box */}
          <div className="rounded-md border border-[#232732] bg-[#0d0f14] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#111318] border-b border-[#232732] flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-1.5 text-sky-400">
                <Terminal size={12} />
                <span>cURL Command</span>
              </div>
              <span className="text-slate-500">POSIX shell syntax</span>
            </div>

            <pre className="p-3 font-mono text-xs text-slate-200 overflow-x-auto max-h-72 whitespace-pre leading-relaxed select-all selection:bg-sky-900 selection:text-white">
              {command}
            </pre>
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-[#232732]">
        <span className="text-[11px] text-slate-500 font-mono">
          {command ? `${command.length} characters` : ''}
        </span>

        <div className="flex items-center gap-2">
          {onClose && (
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            onClick={handleCopy}
            disabled={isLoading || !command}
            className="text-xs inline-flex items-center gap-1.5"
          >
            {isCopied ? (
              <>
                <Check size={13} className="text-emerald-300" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy cURL</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

