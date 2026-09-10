import React from 'react';
import Select from '../../../components/ui/Select';

export default function EnvironmentSwitcher() {
  return (
    <div className="w-40">
      <Select defaultValue="no-env">
        <option value="no-env">No Environment</option>
        <option value="dev">Development</option>
        <option value="staging">Staging</option>
        <option value="prod">Production</option>
      </Select>
    </div>
  );
}
