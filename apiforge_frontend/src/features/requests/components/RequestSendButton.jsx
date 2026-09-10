import React from 'react';
import Button from '../../../components/ui/Button';

export default function RequestSendButton({ onSend, loading }) {
  return (
    <Button variant="primary" onClick={onSend} disabled={loading}>
      {loading ? 'Sending...' : 'Send'}
    </Button>
  );
}
