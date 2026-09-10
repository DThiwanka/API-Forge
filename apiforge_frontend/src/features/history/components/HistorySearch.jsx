import React from 'react';
import Input from '../../../components/ui/Input';

export default function HistorySearch({ onSearch }) {
  return (
    <Input
      placeholder="Search history..."
      onChange={(e) => onSearch?.(e.target.value)}
      className="text-xs"
    />
  );
}
