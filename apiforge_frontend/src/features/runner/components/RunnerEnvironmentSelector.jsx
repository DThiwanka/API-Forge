import { useMemo } from 'react';
import { Database, ChevronDown } from 'lucide-react';
import { useEnvironmentsQuery } from '../../environments/hooks/useEnvironments';
import { cn } from '../../../utils/cn';

export default function RunnerEnvironmentSelector({
  workspaceId,
  selectedEnvironmentId,
  onSelectEnvironment,
  disabled = false,
  className,
}) {
  const { data: environments = [], isLoading } = useEnvironmentsQuery(workspaceId);

  const activeEnv = useMemo(() => {
    return environments.find((e) => e.isActive) || null;
  }, [environments]);

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <span className="flex items-center gap-1.5">
          <Database size={13} className="text-sky-400" />
          <span>Environment</span>
        </span>
        {activeEnv && (
          <span className="text-[10px] font-normal text-slate-500 font-mono">
            Active: <span className="text-emerald-400 font-medium">{activeEnv.name}</span>
          </span>
        )}
      </label>

      <div className="relative">
        <select
          value={selectedEnvironmentId ?? ''}
          onChange={(e) => onSelectEnvironment(e.target.value === '' ? null : e.target.value)}
          disabled={disabled || isLoading}
          className="w-full h-8 pl-3 pr-8 bg-[#141720] border border-[#2b3140] rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Default / Active environment option */}
          <option value="">
            {activeEnv ? `Active Environment (${activeEnv.name})` : 'Use Active Environment (None)'}
          </option>

          {/* Explicit environments */}
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name} {env.isActive ? '(Active)' : ''}
            </option>
          ))}

          {/* No environment option */}
          <option value="none">No Environment (Skip environment variables)</option>
        </select>

        <ChevronDown
          size={13}
          className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );
}

