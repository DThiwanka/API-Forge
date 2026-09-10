import React, { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import CurlImport from './CurlImport';
import OpenApiImport from './OpenApiImport';

export default function ImportDialog({ isOpen, onClose, onImport }) {
  const [tab, setTab] = useState('curl');

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Import Request or Specification">
      <div className="flex gap-2 border-b border-slate-700 pb-2 mb-4 text-xs">
        <button
          onClick={() => setTab('curl')}
          className={`px-2 py-1 rounded ${tab === 'curl' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          cURL
        </button>
        <button
          onClick={() => setTab('openapi')}
          className={`px-2 py-1 rounded ${tab === 'openapi' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          OpenAPI / Swagger
        </button>
      </div>
      {tab === 'curl' ? <CurlImport onImport={onImport} /> : <OpenApiImport onImport={onImport} />}
    </Dialog>
  );
}
