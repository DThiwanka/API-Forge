import React from 'react';
import Input from '../../../components/ui/Input';

export default function ResponseSearch({ onSearch }) {
  return (
    <div className="w-48">
      <Input placeholder="Search response..." onChange={(e) => onSearch?.(e.target.value)} />
    </div>
  );
}
