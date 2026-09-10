import React from 'react';
import Badge from '../../../components/ui/Badge';

export default function ResponseStatus({ status = 200, statusText = 'OK' }) {
  const isOk = status >= 200 && status < 300;
  return (
    <div className="flex items-center gap-2">
      <Badge variant={isOk ? 'success' : 'danger'}>
        {status} {statusText}
      </Badge>
    </div>
  );
}
