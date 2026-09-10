import React from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function WorkspaceSettings() {
  return (
    <div className="max-w-xl space-y-6">
      <h3 className="text-base font-semibold text-slate-200">General Settings</h3>
      <div className="space-y-3">
        <label className="block text-xs text-slate-400">Workspace Name</label>
        <Input defaultValue="Default Workspace" />
      </div>
      <Button variant="primary">Save Changes</Button>
    </div>
  );
}
