import { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';

function RenameForm({ initialName, onSave, onClose }) {
  const [name, setName] = useState(initialName || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to rename item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">
          New Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
          className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#232732]">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading || !name.trim()}
        >
          {loading ? 'Saving...' : 'Rename'}
        </Button>
      </div>
    </form>
  );
}

export default function RenameDialog({
  isOpen,
  onClose,
  title = 'Rename Item',
  initialName = '',
  onSave,
}) {
  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <RenameForm
        initialName={initialName}
        onSave={onSave}
        onClose={onClose}
      />
    </Dialog>
  );
}

