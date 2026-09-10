import React from 'react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function AccountSettings() {
  return (
    <div className="p-6 max-w-xl space-y-4">
      <h3 className="text-lg font-semibold text-slate-100">Account Settings</h3>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Email</label>
        <Input defaultValue="user@example.com" />
      </div>
      <Button variant="primary">Update Profile</Button>
    </div>
  );
}
