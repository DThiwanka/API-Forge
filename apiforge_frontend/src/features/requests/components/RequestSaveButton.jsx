import React from 'react';
import Button from '../../../components/ui/Button';

export default function RequestSaveButton({ onSave }) {
  return (
    <Button variant="secondary" onClick={onSave}>
      Save
    </Button>
  );
}
