import React, { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function CreateFolderDialog({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate?.({ name });
    setName('');
    onClose?.();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="New Folder">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Folder Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">Create</Button>
        </div>
      </form>
    </Dialog>
  );
}
