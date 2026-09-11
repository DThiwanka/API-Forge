import { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import CurlExport from './CurlExport';
import OpenApiExport from './OpenApiExport';
import { Terminal, FileCode2 } from 'lucide-react';

export default function ExportDialog({
  isOpen,
  onClose,
  workspaceId,
  requestId,
  requestName,
  defaultCollectionId,
  initialTab = 'curl',
  initialFormat = 'json',
}) {
  const [activeTab, setActiveTab] = useState(
    requestId ? initialTab : 'openapi'
  );

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        activeTab === 'curl'
          ? requestName
            ? `Export "${requestName}"`
            : 'Export Request as cURL'
          : 'Export OpenAPI Specification'
      }
      className="max-w-2xl bg-[#14171f] border-[#2b313e] p-5 max-h-[90vh] overflow-y-auto"
    >
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#232732] pb-3 mb-4 -mt-2">
        {requestId && (
          <button
            type="button"
            onClick={() => setActiveTab('curl')}
            className={`px-3.5 py-1.5 text-xs rounded-md font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'curl'
                ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Terminal size={13} />
            <span>cURL Command</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('openapi')}
          className={`px-3.5 py-1.5 text-xs rounded-md font-medium flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'openapi'
              ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <FileCode2 size={13} />
          <span>OpenAPI 3.0</span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'curl' && (
        <div className="animate-in fade-in duration-150">
          <CurlExport
            workspaceId={workspaceId}
            requestId={requestId}
            onClose={onClose}
          />
        </div>
      )}

      {activeTab === 'openapi' && (
        <div className="animate-in fade-in duration-150">
          <OpenApiExport
            workspaceId={workspaceId}
            defaultCollectionId={defaultCollectionId}
            initialFormat={initialFormat}
            onClose={onClose}
          />
        </div>
      )}
    </Dialog>
  );
}
