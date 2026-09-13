import { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';

export default function DuplicateRequestDialog({
  isOpen,
  onClose,
  request,
  onDuplicate,
}) {
  const [name, setName] = useState(
    request?.name ? `${request.name} Copy` : 'Request Copy'
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Request name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onDuplicate(trimmed);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to duplicate request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Duplicate Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            New Request Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            autoFocus
            required
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        <div className="p-2.5 rounded bg-[#111318] border border-[#232732] text-xs text-slate-400 space-y-1">
          <div className="font-medium text-slate-300">Target Location:</div>
          <div className="font-mono text-[11px] text-slate-400 truncate">
            Method: <span className="text-sky-400 font-bold">{request?.method || 'GET'}</span>
            {request?.url && ` • ${request.url}`}
          </div>
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
            {loading ? 'Duplicating...' : 'Duplicate Request'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

