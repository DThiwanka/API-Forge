import React from 'react';
import Textarea from '../../../components/ui/Textarea';

export default function BodyEditor({ body = '', onChange }) {
  return (
    <Textarea
      value={body}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder='{\n  "key": "value"\n}'
      rows={5}
    />
  );
}
