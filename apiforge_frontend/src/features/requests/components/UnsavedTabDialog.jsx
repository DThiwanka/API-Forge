import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';

export default function UnsavedTabDialog({
  isOpen,
  onClose,
  onConfirmDiscard,
  tabTitle = 'This request',
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Unsaved Changes"
      className="max-w-md bg-[#11141c] border border-[#272d3d] text-slate-200"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-100">
              &quot;{tabTitle}&quot; has unsaved changes.
            </p>
            <p className="text-slate-400">
              Closing this tab will discard your in-progress modifications. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#232838]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirmDiscard}
            className="bg-rose-600 hover:bg-rose-500 text-white"
          >
            Discard Changes
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

