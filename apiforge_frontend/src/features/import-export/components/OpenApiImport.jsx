import React from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function OpenApiImport({ onImport }) {
  return (
    <div className="space-y-3">
      <Input placeholder="Enter OpenAPI / Swagger URL or upload JSON/YAML" />
      <Button variant="primary" onClick={onImport} className="w-full">
        Import Specification
      </Button>
    </div>
  );
}
