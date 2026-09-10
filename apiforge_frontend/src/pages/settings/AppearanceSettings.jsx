import React from 'react';
import Select from '../../components/ui/Select';

export default function AppearanceSettings() {
  return (
    <div className="p-6 max-w-xl space-y-4">
      <h3 className="text-lg font-semibold text-slate-100">Appearance Settings</h3>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Theme</label>
        <Select defaultValue="dark">
          <option value="dark">Dark Theme</option>
          <option value="light">Light Theme</option>
          <option value="system">System Default</option>
        </Select>
      </div>
    </div>
  );
}
