import React from 'react';
import Select from '../../../components/ui/Select';

export default function PermissionSelector({ value, onChange }) {
  return (
    <Select value={value} onChange={(e) => onChange?.(e.target.value)}>
      <option value="read">Read Only</option>
      <option value="write">Read & Write</option>
      <option value="admin">Admin</option>
    </Select>
  );
}
