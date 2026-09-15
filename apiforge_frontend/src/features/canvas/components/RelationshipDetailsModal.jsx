import { memo } from 'react';
import {
  X,
  ArrowRight,
  Sparkles,
  Link,
  KeyRound,
  Variable,
  Info,
  ExternalLink,
  Check,
} from 'lucide-react';
import useCanvasStore from '../store/canvasStore';
import { getMethodStyle } from '../utils/nodeHelpers';

export function RelationshipDetailsModal({ onSaveLayout }) {
  const selectedRelationship = useCanvasStore((s) => s.selectedRelationship);
  const setSelectedRelationship = useCanvasStore((s) => s.setSelectedRelationship);
  const promoteInferredToExplicit = useCanvasStore((s) => s.promoteInferredToExplicit);
  const setFocusNodeId = useCanvasStore((s) => s.setFocusNodeId);

  if (!selectedRelationship) return null;

  const { id, source, target, data = {} } = selectedRelationship;
  const isInferred = Boolean(data.isInferred);
  const relType = data.relationshipType || 'EXPLICIT';

  const sourceMethodStyle = getMethodStyle(data.sourceMethod || 'GET');
  const targetMethodStyle = getMethodStyle(data.targetMethod || 'GET');

  const handlePromote = () => {
    promoteInferredToExplicit(id);
    if (onSaveLayout) {
      setTimeout(onSaveLayout, 50);
    }
  };

  const handleFocusNode = (nodeId) => {
    setFocusNodeId(nodeId);
    setSelectedRelationship(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={() => setSelectedRelationship(null)}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#111318] border border-[#262c3b] shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#212634] flex items-center justify-between bg-[#151824]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              {relType === 'AUTH' ? (
                <KeyRound size={15} />
              ) : relType === 'VARIABLE' ? (
                <Variable size={15} />
              ) : (
                <Link size={15} />
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                <span>Relationship Details</span>
                {isInferred ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-normal bg-indigo-950/70 border border-indigo-700/50 text-indigo-300">
                    Inferred
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-normal bg-sky-950/70 border border-sky-700/50 text-sky-300">
                    Explicit
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                {relType === 'AUTH'
                  ? 'Authentication Dependency'
                  : relType === 'VARIABLE'
                  ? 'Variable Dependency'
                  : relType === 'RESOURCE'
                  ? 'Shared Resource Proximity'
                  : 'Manual Canvas Connection'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedRelationship(null)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1f242e] transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Source & Target Flow Display */}
          <div className="p-3 rounded-xl bg-[#161922] border border-[#232732] space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Connected Endpoints
            </div>

            <div className="flex items-center gap-3">
              {/* Source */}
              <div className="flex-1 p-2.5 rounded-lg bg-[#0d0f14] border border-[#1f242e]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 font-mono">Source</span>
                  <button
                    type="button"
                    onClick={() => handleFocusNode(source)}
                    className="text-[10px] text-sky-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Focus</span>
                    <ExternalLink size={9} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${sourceMethodStyle.badge}`}
                  >
                    {data.sourceMethod || 'REQ'}
                  </span>
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {data.sourceName || 'Source Request'}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="shrink-0 text-slate-500">
                <ArrowRight size={16} />
              </div>

              {/* Target */}
              <div className="flex-1 p-2.5 rounded-lg bg-[#0d0f14] border border-[#1f242e]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 font-mono">Target</span>
                  <button
                    type="button"
                    onClick={() => handleFocusNode(target)}
                    className="text-[10px] text-sky-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Focus</span>
                    <ExternalLink size={9} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${targetMethodStyle.badge}`}
                  >
                    {data.targetMethod || 'REQ'}
                  </span>
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {data.targetName || 'Target Request'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rationale & Explanation */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Why this relationship was detected
            </div>
            <div className="p-3 rounded-xl bg-[#161922] border border-[#232732] text-xs text-slate-300 leading-relaxed">
              {data.reason || 'This connection indicates an association between the two requests on your API surface.'}
            </div>
          </div>

          {/* Variable details if any */}
          {Array.isArray(data.variableNames) && data.variableNames.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Shared Variables
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.variableNames.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 font-mono text-[11px]"
                  >
                    <span>&#123;&#123;{v}&#125;&#125;</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Informational Disclaimer Banner */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#141720] border border-[#232732] text-[11px] text-slate-400">
            <Info size={14} className="shrink-0 text-slate-400 mt-0.5" />
            <div className="leading-snug">
              Canvas relationships are purely visual and informational for API architecture discovery. They do not trigger automated chained execution.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#212634] flex items-center justify-between bg-[#151824]">
          <div>
            {isInferred ? (
              <button
                type="button"
                onClick={handlePromote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c202c] hover:bg-[#252b3b] border border-[#2e3547] text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                title="Save this inferred relationship as a permanent explicit edge"
              >
                <Sparkles size={12} className="text-amber-400" />
                <span>Make Connection Permanent</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Check size={12} className="text-emerald-400" />
                <span>Permanent Canvas Edge</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedRelationship(null)}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(RelationshipDetailsModal);

