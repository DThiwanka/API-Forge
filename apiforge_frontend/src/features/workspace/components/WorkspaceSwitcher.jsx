import React from 'react';
import Select from '../../../components/ui/Select';

export default function WorkspaceSwitcher() {
  return (
    <div className="w-48">
      <Select defaultValue="default">
        <option value="default">Default Workspace</option>
        <option value="team">Team Workspace</option>
      </Select>
    </div>
  );
}
