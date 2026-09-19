import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import {
  resolveRequestUrlForBrowser,
  validateBrowserNavigationTarget,
} from '../../browser/utils/browserClientIntegration';
import { useVariableSuggestions } from '../../requests/hooks/useVariableSuggestions';
import {
  AlertTriangle,
  ShieldAlert,
  Compass,
  ArrowRight,
} from 'lucide-react';

export default function OpenInBrowserModal({
  isOpen,
  onClose,
  workspaceId,
  url = '',
  method = 'GET',
  variableMap: propVariableMap,
  activeEnv: propActiveEnv,
  onConfirmSuccess = null,
}) {
  const navigate = useNavigate();
  const suggestions = useVariableSuggestions(isOpen ? workspaceId : null);
  const effectiveVariableMap = propVariableMap || suggestions.variableMap;
  const effectiveActiveEnv = propActiveEnv !== undefined ? propActiveEnv : suggestions.activeEnv;

  // 1. Variable Resolution
  const { resolvedUrl, unresolvedVariables, hasUnresolved } = useMemo(() => {
    if (!isOpen || !url) {
      return { resolvedUrl: '', unresolvedVariables: [], hasUnresolved: false };
    }
    return resolveRequestUrlForBrowser(url, effectiveVariableMap || new Map(), effectiveActiveEnv);
  }, [isOpen, url, effectiveVariableMap, effectiveActiveEnv]);

  // 2. Security & SSRF Validation
  const validation = useMemo(() => {
    if (!isOpen || !resolvedUrl) {
      return { isValid: false, normalizedUrl: '', error: null, code: null };
    }
    return validateBrowserNavigationTarget(resolvedUrl);
  }, [isOpen, resolvedUrl]);

  const upperMethod = (method || 'GET').toUpperCase();
  const isNonGet = upperMethod !== 'GET';

  // Perform navigation to Browser Space
  const executeNavigation = (targetUrl) => {
    onClose();
    onConfirmSuccess?.();
    navigate(`/workspace/${workspaceId}/browser?openUrl=${encodeURIComponent(targetUrl)}`);
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Open in Browser Space"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs select-none">
        {/* CASE 1: SECURITY / SSRF VIOLATION */}
        {!validation.isValid && validation.error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 flex items-start gap-3">
            <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-200">
                Blocked by Security Policy
              </p>
              <p className="text-rose-300/90 leading-relaxed">
                {validation.error}
              </p>
              <div className="mt-2 p-2 rounded bg-[#10121a] border border-rose-900/40 font-mono text-[11px] text-rose-300 truncate">
                {resolvedUrl || url}
              </div>
            </div>
          </div>
        )}

        {/* CASE 2: UNRESOLVED VARIABLES */}
        {validation.isValid && hasUnresolved && (
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">
                Unresolved URL Variables
              </p>
              <p className="text-slate-300">
                The request URL contains variables that cannot be resolved in the active environment:
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {unresolvedVariables.map((v) => (
                  <span
                    key={v}
                    className="px-1.5 py-0.5 rounded bg-amber-900/50 border border-amber-700/60 font-mono text-[10px] text-amber-200"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
              <p className="text-slate-400 text-[11px] pt-1">
                Please set these variables in your active environment before opening in Browser Space.
              </p>
            </div>
          </div>
        )}

        {/* CASE 3: NON-GET METHOD WARNING */}
        {validation.isValid && !hasUnresolved && isNonGet && (
          <div className="p-3 rounded-lg bg-[#141722] border border-[#2b313e] flex items-start gap-3">
            <Compass size={18} className="text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-slate-100">
                Navigation Semantics Notice
              </p>
              <p className="text-slate-300 leading-relaxed">
                Browser Space opens URLs as standard web navigation.
                This will perform a <span className="text-emerald-400 font-semibold font-mono">GET</span> request
                and will <strong className="text-amber-300 font-medium">NOT</strong> reproduce the current HTTP method (<span className="text-amber-400 font-bold font-mono">{upperMethod}</span>) or request body.
              </p>

              <div className="p-2 rounded bg-[#0b0d13] border border-[#232732] font-mono text-[11px] text-slate-300 truncate">
                {validation.normalizedUrl}
              </div>
            </div>
          </div>
        )}

        {/* DIALOG ACTIONS */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#232732]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          {validation.isValid && !hasUnresolved && (
            <Button
              type="button"
              variant="primary"
              onClick={() => executeNavigation(validation.normalizedUrl)}
              className="flex items-center gap-1.5"
            >
              <span>{isNonGet ? 'Open URL Anyway' : 'Open in Browser'}</span>
              <ArrowRight size={13} />
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
