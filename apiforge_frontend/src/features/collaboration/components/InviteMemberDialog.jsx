import React, { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

export default function InviteMemberDialog({ isOpen, onClose, onInvite }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');

  const handleSubmit = (e) => {
    e.preventDefault();
    onInvite?.({ email, role });
    setEmail('');
    onClose?.();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Invite Teammate">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Email Address</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Role</label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">Send Invite</Button>
        </div>
      </form>
    </Dialog>
  );
}
