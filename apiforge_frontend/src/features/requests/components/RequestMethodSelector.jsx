import React from 'react';
import Select from '../../../components/ui/Select';

export default function RequestMethodSelector({ method = 'GET', onChange }) {
  return (
    <div className="w-28">
      <Select value={method} onChange={(e) => onChange?.(e.target.value)}>
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="PATCH">PATCH</option>
        <option value="DELETE">DELETE</option>
      </Select>
    </div>
  );
}
