import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useWorkspaceQuery,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
} from '../../../features/workspace/hooks/useWorkspace';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import Alert from '../../../components/ui/Alert';
import { toast } from '../../../stores/toastStore';
import {
  Users,
  Globe,
  Layout,
  Trash2,
  Save,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { copyToClipboard } from '../../../utils/clipboard';

export default function WorkspaceSettings({ workspaceId }) {
  const navigate = useNavigate();
  const { data: workspace, isLoading } = useWorkspaceQuery(workspaceId);
  const updateMutation = useUpdateWorkspaceMutation(workspaceId);
  const deleteMutation = useDeleteWorkspaceMutation();

  const [name, setName] = useState(workspace?.name || '');
  const [description, setDescription] = useState(workspace?.description || '');
  const [isDirty, setIsDirty] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [prevWorkspace, setPrevWorkspace] = useState(workspace);

  if (workspace && workspace !== prevWorkspace) {
    setPrevWorkspace(workspace);
    setName(workspace.name || '');
    setDescription(workspace.description || '');
    setIsDirty(false);
  }

  const role = (workspace?.role || '').toUpperCase();
  const isOwner = role === 'OWNER';
  const isAdminOrOwner = isOwner || role === 'ADMIN';
  const isViewer = role === 'VIEWER';

  const handleNameChange = (val) => {
    setName(val);
    setIsDirty(true);
  };

  const handleDescChange = (val) => {
    setDescription(val);
    setIsDirty(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Workspace name is required');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setIsDirty(false);
      toast.success('Workspace updated successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update workspace');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(workspaceId);
      toast.success('Workspace deleted successfully');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete workspace');
    }
  };

  const handleCopyId = async () => {
    if (!workspaceId) return;
    const success = await copyToClipboard(workspaceId);
    if (success) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.success('Workspace ID copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-xs">Loading workspace details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-100 tracking-wide">Workspace Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage workspace configuration, identity, and lifecycle.
        </p>
      </div>

      {/* Permission Notice for Viewers */}
      {isViewer && (
        <Alert
          type="info"
          title="Read-Only Workspace Access"
          message="You have VIEWER permissions in this workspace. Modifying workspace metadata or deleting the workspace requires OWNER or ADMIN permissions."
        />
      )}

      {/* General Information Card */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">General Information</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Update workspace display name and team description.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Workspace Name</label>
            <input
              type="text"
              value={name}
              disabled={!isAdminOrOwner || updateMutation.isPending}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acme Production Services"
              className="w-full bg-[#0d1017] border border-[#232732] rounded-md px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Description</label>
            <textarea
              value={description}
              disabled={!isAdminOrOwner || updateMutation.isPending}
              onChange={(e) => handleDescChange(e.target.value)}
              rows={3}
              placeholder="Optional summary of this workspace's services and endpoints..."
              className="w-full bg-[#0d1017] border border-[#232732] rounded-md px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Identifier & Role */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#232732]">
            <div>
              <div className="text-[11px] text-slate-400">Workspace ID</div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs font-mono bg-[#0d1017] px-2 py-1 rounded border border-[#232732] text-slate-300 select-all">
                  {workspaceId}
                </code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Copy Workspace ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">Your Membership Role</div>
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {role || 'MEMBER'}
                </span>
              </div>
            </div>
          </div>

          {isAdminOrOwner && (
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!isDirty || updateMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-xs font-medium transition-colors disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to={`/workspace/${workspaceId}/members`}
          className="p-4 rounded-lg bg-[#14171f] border border-[#232732] hover:border-slate-700 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-200 font-medium text-xs group-hover:text-blue-400 transition-colors">
              <Users className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
              <span>Workspace Members</span>
            </div>
            <p className="text-[11px] text-slate-400">Manage member invites, assign roles, and review team access.</p>
          </div>
          <div className="text-[11px] text-blue-400 font-medium mt-3">Open Members &rarr;</div>
        </Link>

        <Link
          to={`/workspace/${workspaceId}/environments`}
          className="p-4 rounded-lg bg-[#14171f] border border-[#232732] hover:border-slate-700 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-200 font-medium text-xs group-hover:text-blue-400 transition-colors">
              <Globe className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
              <span>Environments</span>
            </div>
            <p className="text-[11px] text-slate-400">Configure environment variables, authorization tokens, and baseURLs.</p>
          </div>
          <div className="text-[11px] text-blue-400 font-medium mt-3">Open Environments &rarr;</div>
        </Link>

        <Link
          to={`/workspace/${workspaceId}/canvas`}
          className="p-4 rounded-lg bg-[#14171f] border border-[#232732] hover:border-slate-700 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-200 font-medium text-xs group-hover:text-blue-400 transition-colors">
              <Layout className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
              <span>Visual Canvas</span>
            </div>
            <p className="text-[11px] text-slate-400">Explore API architecture and dependencies in visual canvas mode.</p>
          </div>
          <div className="text-[11px] text-blue-400 font-medium mt-3">Open Canvas &rarr;</div>
        </Link>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="p-5 rounded-lg bg-rose-950/15 border border-rose-500/20 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Danger Zone</h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-200">Delete this workspace</div>
              <p className="text-[11px] text-slate-400 max-w-lg">
                Permanently deletes this workspace and all associated collections, requests, environments, and execution history. This action cannot be undone.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title={`Delete "${workspace?.name || 'Workspace'}"`}
        message={`Are you absolutely sure you want to delete "${workspace?.name || 'this workspace'}"? All collections, requests, environments, and history will be permanently erased.`}
        confirmText="Yes, delete workspace"
        cancelText="Cancel"
        isDanger={true}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
