import React from 'react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function SecuritySettings() {
  return (
    <div className="p-6 max-w-xl space-y-4">
      <h3 className="text-lg font-semibold text-slate-100">Security & Authentication</h3>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Current Password</label>
        <Input type="password" />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">New Password</label>
        <Input type="password" />
      </div>
      <Button variant="primary">Change Password</Button>
    </div>
  );
}
