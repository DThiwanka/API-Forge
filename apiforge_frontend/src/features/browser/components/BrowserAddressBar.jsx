import React from 'react';
import Input from '../../../components/ui/Input';

export default function BrowserAddressBar({ url = 'https://', onNavigate }) {
  return (
    <div className="px-3 py-1.5 bg-slate-900/50 border-b border-slate-800">
      <Input
        defaultValue={url}
        placeholder="Enter URL to test or capture requests..."
        className="h-8 text-xs font-mono"
      />
    </div>
  );
}
