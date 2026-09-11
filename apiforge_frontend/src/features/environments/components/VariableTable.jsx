import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Check,
  Globe,
  Edit2,
  Trash2,
  Loader2,
  Layers,
  AlertCircle,
} from 'lucide-react';
import VariableRow from './VariableRow';
import VariableDialog from './VariableDialog';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import {
  useEnvironmentQuery,
  useVariablesQuery,
  useActivateEnvironmentMutation,
  useDeleteVariableMutation,
} from '../hooks/useEnvironments';

export default function VariableTable({
  workspaceId,
  environmentId,
  canManage = true,
  onEditEnvironment,
  onDeleteEnvironment,
}) {
  const [search, setSearch] = useState('');
  const [isAddVariableOpen, setIsAddVariableOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [deletingVariable, setDeletingVariable] = useState(null);

  const {
    data: environment,
    isLoading: loadingEnv,
    isError: errorEnv,
  } = useEnvironmentQuery(workspaceId, environmentId);

  const {
    data: variables = [],
    isLoading: loadingVars,
    isError: errorVars,
  } = useVariablesQuery(workspaceId, environmentId);

  const activateMutation = useActivateEnvironmentMutation(workspaceId);
  const deleteVariableMutation = useDeleteVariableMutation(workspaceId, environmentId);

  const filteredVariables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return variables;
    return variables.filter(
      (v) =>
        v.key.toLowerCase().includes(query) ||
        (!v.isSecret && v.value?.toLowerCase().includes(query))
    );
  }, [variables, search]);

  const handleActivate = () => {
    if (!environmentId || activateMutation.isPending) return;
    activateMutation.mutate(environmentId);
  };

  const handleConfirmDeleteVariable = () => {
    if (!deletingVariable) return;
    deleteVariableMutation.mutate(deletingVariable.id, {
      onSettled: () => setDeletingVariable(null),
    });
  };

  if (!environmentId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs bg-[#0d0f14] select-none">
        <div className="w-12 h-12 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-center text-slate-400 mb-3 shadow-md">
          <Globe size={22} />
        </div>
        <h3 className="text-sm font-semibold text-slate-300 mb-1">
          No Environment Selected
        </h3>
        <p className="max-w-xs text-slate-500">
          Select an environment from the list on the left to inspect and manage its variables.
        </p>
      </div>
    );
  }

  if (loadingEnv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-[#0d0f14]">
        <Loader2 size={24} className="animate-spin text-sky-500 mb-2" />
        <span className="text-xs font-mono">Loading environment details...</span>
      </div>
    );
  }

  if (errorEnv || !environment) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-rose-400 text-xs bg-[#0d0f14]">
        <AlertCircle size={24} className="mb-2" />
        <span>Failed to load environment</span>
      </div>
    );
  }

  const isActive = Boolean(environment.isActive);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f14] overflow-hidden">
      {/* Environment Header Banner */}
      <div className="p-4 border-b border-[#232732] bg-[#111318] flex items-center justify-between select-none">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-slate-100 truncate">
              {environment.name}
            </h2>

            {isActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 shadow-xs">
                <Check size={12} />
                <span>Active</span>
              </span>
            ) : canManage ? (
              <button
                type="button"
                onClick={handleActivate}
                disabled={activateMutation.isPending}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium text-slate-300 hover:text-white bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] transition-colors"
                title="Set as workspace active environment"
              >
                {activateMutation.isPending ? (
                  <Loader2 size={11} className="animate-spin text-sky-400" />
                ) : (
                  <Check size={11} className="text-slate-400" />
                )}
                <span>Set Active</span>
              </button>
            ) : null}
          </div>

          <p className="text-xs text-slate-400 truncate max-w-xl">
            {environment.description || (
              <span className="italic text-slate-500">No description provided</span>
            )}
          </p>
        </div>

        {/* Environment Top Actions */}
        {canManage && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onEditEnvironment(environment)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-200 transition-colors"
              title="Edit environment name or description"
            >
              <Edit2 size={12} className="text-slate-400" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteEnvironment(environment)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#181b22] hover:bg-rose-950/40 hover:text-rose-300 border border-[#2b313e] hover:border-rose-900/50 text-xs text-slate-300 transition-colors"
              title="Delete this environment"
            >
              <Trash2 size={12} className="text-rose-400" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Variables Table Controls Toolbar */}
      <div className="px-4 py-2.5 border-b border-[#232732] bg-[#0f1117] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter variables by key..."
              className="w-48 h-7 pl-7 pr-3 bg-[#181b22] border border-[#2b313e] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            {variables.length} {variables.length === 1 ? 'variable' : 'variables'}
          </span>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsAddVariableOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Plus size={13} />
            <span>Add Variable</span>
          </button>
        )}
      </div>

      {/* Variables Table Content */}
      <div className="flex-1 overflow-y-auto">
        {loadingVars ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-xs">
            <Loader2 size={18} className="animate-spin text-sky-500 mb-2" />
            <span>Loading variables...</span>
          </div>
        ) : errorVars ? (
          <div className="p-8 text-center text-rose-400 text-xs">
            Failed to load environment variables
          </div>
        ) : filteredVariables.length === 0 ? (
          <div className="p-12 text-center select-none text-xs text-slate-500">
            {search ? (
              'No variables match your filter'
            ) : (
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-center text-slate-400 mx-auto">
                  <Layers size={18} />
                </div>
                <div>
                  <div className="font-semibold text-slate-300">No Variables Yet</div>
                  <div className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                    Store reusable values like baseUrl, apiKey, or credentials using &#123;&#123;key&#125;&#125; syntax.
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setIsAddVariableOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium transition-colors"
                  >
                    <Plus size={12} />
                    <span>Add Variable</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#111318] sticky top-0 z-10 border-b border-[#232732] select-none text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 font-medium w-1/4">Key</th>
                <th className="px-4 py-2 font-medium w-1/2">Value</th>
                <th className="px-4 py-2 font-medium w-1/6">Type</th>
                <th className="px-4 py-2 font-medium text-right w-1/12">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVariables.map((variable) => (
                <VariableRow
                  key={variable.id}
                  variable={variable}
                  canManage={canManage}
                  onEdit={(v) => setEditingVariable(v)}
                  onDelete={(v) => setDeletingVariable(v)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Variable Dialog */}
      <VariableDialog
        isOpen={isAddVariableOpen}
        onClose={() => setIsAddVariableOpen(false)}
        workspaceId={workspaceId}
        environmentId={environmentId}
      />

      {/* Edit Variable Dialog */}
      <VariableDialog
        isOpen={Boolean(editingVariable)}
        onClose={() => setEditingVariable(null)}
        workspaceId={workspaceId}
        environmentId={environmentId}
        initialVariable={editingVariable}
      />

      {/* Delete Variable Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingVariable)}
        title={`Delete Variable "${deletingVariable?.key}"?`}
        message={`Are you sure you want to delete the variable "${deletingVariable?.key}" from ${environment.name}? Any requests referencing {{${deletingVariable?.key}}} will fail unless defined elsewhere.`}
        confirmText="Delete Variable"
        confirmVariant="danger"
        isLoading={deleteVariableMutation.isPending}
        onConfirm={handleConfirmDeleteVariable}
        onClose={() => setDeletingVariable(null)}
      />
    </div>
  );
}
