import React from 'react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import { Loader2 } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) {
  return (
    <Dialog isOpen={isOpen} onClose={isLoading ? undefined : onClose} title={title}>
      <p className="text-sm text-slate-300 mb-6 leading-relaxed font-sans">{message}</p>
      <div className="flex justify-end gap-2.5">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={variant}
          onClick={onConfirm}
          disabled={isLoading}
          className="min-w-[5rem]"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin" />
              <span>Processing...</span>
            </span>
          ) : (
            confirmLabel
          )}
        </Button>
      </div>
    </Dialog>
  );
}
