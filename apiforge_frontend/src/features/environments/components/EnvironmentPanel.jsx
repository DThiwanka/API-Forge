import React from 'react';
import EnvironmentList from './EnvironmentList';
import VariableTable from './VariableTable';

export default function EnvironmentPanel() {
  return (
    <div className="flex-1 flex flex-col p-4">
      <h3 className="text-base font-semibold text-slate-200 mb-4">Manage Environments</h3>
      <div className="flex-1 flex gap-4">
        <EnvironmentList />
        <VariableTable />
      </div>
    </div>
  );
}
