import { useState, useMemo } from 'react';
import { Plus, Search, Globe, Check, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function EnvironmentList({
  environments = [],
  selectedEnvironmentId,
  onSelectEnvironment,
  onOpenCreate,
  isLoading,
  canManage = true,
}) {
  const [search, setSearch] = useState('');

  const filteredEnvironments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return environments;
    return environments.filter(
      (env) =>
        env.name.toLowerCase().includes(query) ||
        (env.description && env.description.toLowerCase().includes(query))
    );
  }, [environments, search]);

  return (
    <div className="w-72 h-full bg-[#111318] border-r border-[#232732] flex flex-col flex-shrink-0 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#232732] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Globe size={14} className="text-sky-400" />
            <span>Environments</span>
            {environments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#181b22] text-slate-400 border border-[#232732]">
                {environments.length}
              </span>
            )}
          </div>

          {canManage && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium transition-colors"
              title="Create new environment"
            >
              <Plus size={12} />
              <span>New</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter environments..."
            className="w-full h-7 pl-7 pr-3 bg-[#14171f] border border-[#232732] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {/* Environment Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-slate-500 text-xs">
            <Loader2 size={16} className="animate-spin text-sky-500 mb-2" />
            <span>Loading environments...</span>
          </div>
        ) : filteredEnvironments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {search ? 'No matching environments' : 'No environments in this workspace'}
          </div>
        ) : (
          filteredEnvironments.map((env) => {
            const isSelected = env.id === selectedEnvironmentId;
            const isActive = env.isActive;

            return (
              <div
                key={env.id}
                onClick={() => onSelectEnvironment(env.id)}
                className={cn(
                  'w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer group select-none',
                  isSelected
                    ? 'bg-[#181b22] border-sky-500/60 shadow-xs'
                    : 'bg-[#14171f]/50 hover:bg-[#181b22]/70 border-transparent hover:border-[#232732]'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-xs font-semibold truncate',
                      isSelected ? 'text-sky-300' : 'text-slate-200 group-hover:text-slate-100'
                    )}
                  >
                    {env.name}
                  </span>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isActive && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
                        <Check size={10} />
                        <span>Active</span>
                      </span>
                    )}
                    {env.variableCount !== undefined && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {env.variableCount} {env.variableCount === 1 ? 'var' : 'vars'}
                      </span>
                    )}
                  </div>
                </div>

                {env.description && (
                  <p className="text-[11px] text-slate-400 truncate">
                    {env.description}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

