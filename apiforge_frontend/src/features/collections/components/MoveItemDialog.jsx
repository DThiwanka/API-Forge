import { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { useFoldersQuery } from '../hooks/useCollections';

// Helper to flatten folder tree with indentation for dropdown
function flattenFolderTree(folders = [], currentFolderId = null, depth = 0) {
  const result = [];
  for (const f of folders) {
    // If moving a folder, exclude the folder itself and its descendants
    if (currentFolderId && f.id === currentFolderId) continue;
    result.push({
      id: f.id,
      name: `${'— '.repeat(depth)}${f.name}`,
    });
    if (f.children && f.children.length > 0) {
      result.push(...flattenFolderTree(f.children, currentFolderId, depth + 1));
    }
  }
  return result;
}

export default function MoveItemDialog({
  isOpen,
  onClose,
  itemType = 'request', // 'request' | 'folder'
  item,
  workspaceId,
  collectionId,
  onMove,
}) {
  const currentTargetId = itemType === 'request' ? (item?.folderId || '') : (item?.parentId || '');
  const [selectedFolderId, setSelectedFolderId] = useState(currentTargetId);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: folders = [] } = useFoldersQuery(workspaceId, collectionId);
  const flatFolders = flattenFolderTree(
    folders,
    itemType === 'folder' ? item?.id : null
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const targetId = selectedFolderId === '' ? null : selectedFolderId;
      await onMove(targetId);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to move item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Move ${itemType === 'request' ? 'Request' : 'Folder'} "${item?.name || ''}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Destination
          </label>
          <select
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          >
            <option value="">Collection Root (Top Level)</option>
            {flatFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#232732]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Moving...' : 'Move'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

