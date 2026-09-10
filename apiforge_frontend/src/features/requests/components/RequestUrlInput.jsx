import React from 'react';
import Input from '../../../components/ui/Input';

export default function RequestUrlInput({ url = '', onChange }) {
  return (
    <div className="flex-1">
      <Input
        value={url}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="https://api.example.com/v1/endpoint"
      />
    </div>
  );
}
