import React from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';

export default function ExportDialog({ isOpen, onClose, onExport }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Export Collection">
      <p className="text-sm text-slate-400 mb-4">Export your collection to Postman, OpenAPI, or API Forge JSON.</p>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onExport}>Export JSON</Button>
      </div>
    </Dialog>
  );
}
