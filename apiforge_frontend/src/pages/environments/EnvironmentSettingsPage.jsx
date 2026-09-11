import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import CollectionTree from '../../features/collections/components/CollectionTree';
import EnvironmentList from '../../features/environments/components/EnvironmentList';
import VariableTable from '../../features/environments/components/VariableTable';
import CreateEnvironmentDialog from '../../features/environments/components/CreateEnvironmentDialog';
import EditEnvironmentDialog from '../../features/environments/components/EditEnvironmentDialog';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  useEnvironmentsQuery,
  useDeleteEnvironmentMutation,
} from '../../features/environments/hooks/useEnvironments';
import { useWorkspaceQuery, useWorkspacesQuery } from '../../features/workspace/hooks/useWorkspace';
import useWorkspaceStore from '../../features/workspace/store/workspaceStore';
import { Globe, Plus, AlertCircle, Loader2 } from 'lucide-react';

export default function EnvironmentSettingsPage() {
  const { workspaceId: routeWorkspaceId } = useParams();
  const navigate = useNavigate();

  const {
    data: workspaces = [],
    isLoading: loadingWorkspaces,
    error: workspaceError,
  } = useWorkspacesQuery();

  const currentWorkspaceId =
    routeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);

  const { data: workspace } = useWorkspaceQuery(currentWorkspaceId);
  const {
    data: environments = [],
    isLoading: loadingEnvironments,
    isError: errorEnvironments,
  } = useEnvironmentsQuery(currentWorkspaceId);

  const deleteEnvironmentMutation = useDeleteEnvironmentMutation(currentWorkspaceId);

  // Local selection state
  const [userSelectedEnvId, setUserSelectedEnvId] = useState(null);
  const [isCreateEnvOpen, setIsCreateEnvOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState(null);
  const [deletingEnv, setDeletingEnv] = useState(null);

  // Derive selected environment ID: user selection if valid, otherwise active env, otherwise first env
  const selectedEnvId = useMemo(() => {
    if (!environments.length) return null;
    if (userSelectedEnvId && environments.some((e) => e.id === userSelectedEnvId)) {
      return userSelectedEnvId;
    }
    const active = environments.find((e) => e.isActive);
    return active ? active.id : environments[0].id;
  }, [environments, userSelectedEnvId]);

  // Sync workspace to store
  useEffect(() => {
    if (currentWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    }
  }, [currentWorkspaceId, setActiveWorkspaceId]);

  // If on /workspace/:workspaceId/environments without valid id, redirect to first workspace
  useEffect(() => {
    if (!routeWorkspaceId && workspaces.length > 0) {
      navigate(`/workspace/${workspaces[0].id}/environments`, { replace: true });
    }
  }, [routeWorkspaceId, workspaces, navigate]);

  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  const handleConfirmDeleteEnv = () => {
    if (!deletingEnv) return;
    deleteEnvironmentMutation.mutate(deletingEnv.id, {
      onSettled: () => setDeletingEnv(null),
    });
  };

  if (workspaceError?.response?.status === 401) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#090a0f] text-slate-400">
          <div className="w-12 h-12 rounded-lg bg-[#111318] border border-[#232732] flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Globe size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Sign in to manage environment variables.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
          >
            Sign In to APIForge
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell workspaceId={currentWorkspaceId}>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left Collections Tree Sidebar */}
        {!sidebarCollapsed && currentWorkspaceId && (
          <CollectionTree workspaceId={currentWorkspaceId} />
        )}

        {/* Main Content Area: Two-pane Environment Manager */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0d0f14]">
          {/* Permissions Notice Banner (if VIEWER or MEMBER) */}
          {!canManage && workspace?.role && (
            <div className="px-4 py-2 bg-amber-950/20 border-b border-amber-900/40 flex items-center justify-between text-xs text-amber-300 select-none">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
                <span>
                  You have <strong>{workspace.role}</strong> permissions. Only Workspace Admins and Owners can create, edit, or activate environments.
                </span>
              </div>
            </div>
          )}

          {loadingWorkspaces || loadingEnvironments ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <Loader2 size={24} className="animate-spin text-sky-500 mb-2" />
              <span className="text-xs font-mono">Loading environments...</span>
            </div>
          ) : errorEnvironments ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-rose-400 text-xs">
              <AlertCircle size={24} className="mb-2" />
              <span>Failed to load workspace environments</span>
            </div>
          ) : environments.length === 0 ? (
            /* Empty State: No Environments */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[radial-gradient(#1a1d26_1px,transparent_1px)] [background-size:16px_16px]">
              <div className="w-12 h-12 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-center text-sky-400 mb-4 shadow-xl">
                <Globe size={22} />
              </div>
              <h2 className="text-base font-semibold text-slate-100 mb-1">
                No Environments Yet
              </h2>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                Environments allow you to define variable sets for Development, Staging, and Production
                that automatically resolve in request URLs, headers, and parameters.
              </p>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsCreateEnvOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm"
                >
                  <Plus size={14} />
                  <span>Create First Environment</span>
                </button>
              )}
            </div>
          ) : (
            /* Two-Pane Environment Management View */
            <div className="flex-1 flex h-full overflow-hidden">
              <EnvironmentList
                environments={environments}
                selectedEnvironmentId={selectedEnvId}
                onSelectEnvironment={setUserSelectedEnvId}
                onOpenCreate={() => setIsCreateEnvOpen(true)}
                isLoading={loadingEnvironments}
                canManage={canManage}
              />

              <VariableTable
                workspaceId={currentWorkspaceId}
                environmentId={selectedEnvId}
                canManage={canManage}
                onEditEnvironment={(env) => setEditingEnv(env)}
                onDeleteEnvironment={(env) => setDeletingEnv(env)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Environment Dialog */}
      <CreateEnvironmentDialog
        isOpen={isCreateEnvOpen}
        onClose={() => setIsCreateEnvOpen(false)}
        workspaceId={currentWorkspaceId}
        onCreated={(newEnv) => {
          if (newEnv?.id) {
            setUserSelectedEnvId(newEnv.id);
          }
        }}
      />

      {/* Edit Environment Dialog */}
      <EditEnvironmentDialog
        isOpen={Boolean(editingEnv)}
        onClose={() => setEditingEnv(null)}
        workspaceId={currentWorkspaceId}
        environment={editingEnv}
      />

      {/* Delete Environment Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingEnv)}
        title={`Delete Environment "${deletingEnv?.name}"?`}
        message={`Are you sure you want to delete "${deletingEnv?.name}"? All variables in this environment will be permanently removed. If this environment is currently active, requests will no longer have an active environment.`}
        confirmText="Delete Environment"
        confirmVariant="danger"
        isLoading={deleteEnvironmentMutation.isPending}
        onConfirm={handleConfirmDeleteEnv}
        onClose={() => setDeletingEnv(null)}
      />
    </AppShell>
  );
}
