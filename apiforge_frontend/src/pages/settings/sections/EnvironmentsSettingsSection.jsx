import { Link } from 'react-router-dom';
import { useEnvironmentsQuery } from '../../../features/environments/hooks/useEnvironments';
import { Globe, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function EnvironmentsSettingsSection({ workspaceId }) {
  const { data: environments = [], isLoading } = useEnvironmentsQuery(workspaceId);

  const activeEnv = environments.find((e) => e.isActive) || environments[0];
  const totalVars = environments.reduce(
    (acc, e) => acc + (Array.isArray(e.variables) ? e.variables.length : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-100 tracking-wide">Environments & Variables</h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage workspace environment definitions, active environment selection, and secure credentials.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-[#14171f] border border-[#232732]">
          <div className="text-[11px] text-slate-400">Total Environments</div>
          <div className="text-xl font-bold text-slate-100 mt-1">
            {isLoading ? '...' : environments.length}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#14171f] border border-[#232732]">
          <div className="text-[11px] text-slate-400">Active Environment</div>
          <div className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-1.5 truncate">
            {isLoading ? (
              '...'
            ) : activeEnv ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{activeEnv.name}</span>
              </>
            ) : (
              'None Selected'
            )}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#14171f] border border-[#232732]">
          <div className="text-[11px] text-slate-400">Total Defined Variables</div>
          <div className="text-xl font-bold text-slate-100 mt-1">
            {isLoading ? '...' : totalVars}
          </div>
        </div>
      </div>

      {/* Direct Management Link */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-slate-200">Environment Manager</h3>
          </div>
          <p className="text-[11px] text-slate-400 max-w-lg">
            Create, edit, duplicate, and configure workspace variables, initial values, and secret tokens in the full environment management view.
          </p>
        </div>

        <Link
          to={`/workspace/${workspaceId}/environments`}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0"
        >
          <span>Manage Environments</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
