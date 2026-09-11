import { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import CurlImport from './CurlImport';
import OpenApiImport from './OpenApiImport';
import { Terminal, FileCode2 } from 'lucide-react';

export default function ImportDialog({
  isOpen,
  onClose,
  workspaceId,
  defaultCollectionId,
  defaultFolderId,
  initialTab = 'curl',
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import Requests"
      className="max-w-3xl bg-[#14171f] border-[#2b313e] p-5 max-h-[90vh] overflow-y-auto"
    >
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#232732] pb-3 mb-4 -mt-2">
        <button
          type="button"
          onClick={() => setActiveTab('curl')}
          className={`px-3.5 py-1.5 text-xs rounded-md font-medium flex items-center gap-2 transition-all ${
            activeTab === 'curl'
              ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Terminal size={13} />
          <span>cURL Command</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('openapi')}
          className={`px-3.5 py-1.5 text-xs rounded-md font-medium flex items-center gap-2 transition-all ${
            activeTab === 'openapi'
              ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <FileCode2 size={13} />
          <span>OpenAPI 3.0 / 3.1</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'curl' && (
        <div className="animate-in fade-in duration-150">
          <div className="text-xs text-slate-400 mb-3 -mt-2">
            Paste a raw cURL command to convert it into a structured APIForge request definition.
          </div>
          <CurlImport
            workspaceId={workspaceId}
            defaultCollectionId={defaultCollectionId}
            defaultFolderId={defaultFolderId}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      )}

      {activeTab === 'openapi' && (
        <div className="animate-in fade-in duration-150">
          <div className="text-xs text-slate-400 mb-3 -mt-2">
            Paste or upload an OpenAPI 3.0 / 3.1 specification (JSON or YAML) to import collections, folders, and requests.
          </div>
          <OpenApiImport
            workspaceId={workspaceId}
            defaultCollectionId={defaultCollectionId}
            defaultFolderId={defaultFolderId}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      )}
    </Dialog>
  );
}
