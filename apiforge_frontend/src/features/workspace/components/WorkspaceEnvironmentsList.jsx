import { useNavigate } from 'react-router-dom';
import { Globe, Check, ArrowUpRight, Plus } from 'lucide-react';
import { useEnvironmentsQuery, useActivateEnvironmentMutation } from '../../environments/hooks/useEnvironments';

export default function WorkspaceEnvironmentsList({ workspaceId, isViewer = false }) {
  const navigate = useNavigate();

  const { data: environments = [], isLoading, isError } = useEnvironmentsQuery(workspaceId);
  const activateMutation = useActivateEnvironmentMutation(workspaceId);

  const activeEnv = environments.find((env) => env.isActive);

  const handleActivate = (e, envId) => {
    e.stopPropagation();
    if (activateMutation.isPending || isViewer) return;
    activateMutation.mutate(envId);
  };

  return (
    <div className="flex flex-col bg-[#11131a] border border-[#232732] rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f232e] bg-[#141721]">
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-purple-400" />
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Environments
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c202d] text-slate-400 border border-[#2a3040]">
            {environments.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/workspace/${workspaceId}/environments`)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <span>Manage</span>
          <ArrowUpRight size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-[#1b1f29] min-h-[120px] flex flex-col justify-center">
        {isLoading ? (
          <div className="flex items-center justify-center p-6 text-xs text-slate-500 font-mono">
            Loading environments...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center p-6 text-xs text-rose-400">
            Failed to load environments
          </div>
        ) : environments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Globe size={22} className="text-slate-600 mb-2" />
            <span className="text-xs font-medium text-slate-300">No environments configured</span>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Configure environment variables to reuse URLs and secrets across requests.
            </p>
            {!isViewer && (
              <button
                type="button"
                onClick={() => navigate(`/workspace/${workspaceId}/environments`)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-medium transition-all cursor-pointer"
              >
                <Plus size={12} />
                <span>Configure Environment</span>
              </button>
            )}
          </div>
        ) : (
          environments.map((env) => {
            const isActive = Boolean(env.isActive);

            return (
              <div
                key={env.id}
                onClick={() => !isActive && !isViewer && handleActivate(null, env.id)}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${
                  !isActive && !isViewer ? 'hover:bg-[#151924] cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {env.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
                      <Check size={11} />
                      Active
                    </span>
                  ) : !isViewer ? (
                    <button
                      type="button"
                      onClick={(e) => handleActivate(e, env.id)}
                      disabled={activateMutation.isPending}
                      className="text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Activate
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      {activeEnv && (
        <div className="px-4 py-2 bg-[#12141d] border-t border-[#1e222d] text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Active Context</span>
          <span className="text-slate-200 font-semibold">{activeEnv.name}</span>
        </div>
      )}
    </div>
  );
}
