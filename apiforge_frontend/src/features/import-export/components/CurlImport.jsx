import React, { useState } from 'react';
import Textarea from '../../../components/ui/Textarea';
import Button from '../../../components/ui/Button';

export default function CurlImport({ onImport }) {
  const [curl, setCurl] = useState('');

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Paste cURL command here..."
        value={curl}
        onChange={(e) => setCurl(e.target.value)}
        rows={6}
      />
      <Button variant="primary" onClick={() => onImport?.(curl)} className="w-full">
        Import cURL
      </Button>
    </div>
  );
}
