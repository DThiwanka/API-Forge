import React from 'react';
import Switch from '../../../components/ui/Switch';

export default function RequestSettings() {
  return (
    <div className="space-y-3">
      <Switch label="Follow Redirects" checked={true} />
      <Switch label="Enable SSL Verification" checked={true} />
    </div>
  );
}
