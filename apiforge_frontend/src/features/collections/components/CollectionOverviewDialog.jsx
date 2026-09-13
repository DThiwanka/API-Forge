import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import useCanvasStore from '../../canvas/store/canvasStore';
import { toast } from '../../../stores/toastStore';
import {
  Layers,
  Folder,
  FileText,
  Play,
  Network,
  Upload,
  Plus,
  FolderPlus,
} from 'lucide-react';

const METHOD_COLORS = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  POST: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PUT: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PATCH: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  DELETE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  HEAD: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  OPTIONS: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
};

export default function CollectionOverviewDialog({
  isOpen,
  onClose,
  collection,
  workspaceId,
  folders = [],
  requests = [],
  isViewer = false,
  onNewRequest,
  onNewFolder,
  onExport,
}) {
  const navigate = useNavigate();
  const addCollectionNodes = useCanvasStore((s) => s.addCollectionNodes);

  // Method distribution calculation
  const methodCounts = useMemo(() => {
    const counts = {};
    for (const r of requests) {
      const method = (r.method || 'GET').toUpperCase();
      counts[method] = (counts[method] || 0) + 1;
    }
    return counts;
  }, [requests]);

  const handleRunCollection = () => {
    onClose();
    navigate(`/workspace/${workspaceId}/runner?collectionId=${collection.id}`);
  };

  const handleAddToCanvas = () => {
    if (requests.length === 0) {
      toast.info('No requests in this collection to add to Canvas');
      return;
    }
    addCollectionNodes(requests, collection.name);
    toast.success(`Added ${requests.length} requests to Canvas`);
    onClose();
    navigate(`/workspace/${workspaceId}/canvas`);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Collection Overview"
      className="max-w-md"
    >
      <div className="space-y-4 text-xs">
        {/* Collection Identity */}
        <div className="flex items-start gap-3 p-3 rounded bg-[#141720] border border-[#232732]">
          <div className="w-9 h-9 rounded bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-sm font-semibold text-slate-100 truncate">
              {collection?.name}
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
              {collection?.description || 'No description provided for this collection.'}
            </p>
          </div>
        </div>

        {/* Resource Summary Statistics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded bg-[#181b22] border border-[#232732] flex items-center gap-2.5">
            <FileText size={16} className="text-sky-400" />
            <div>
              <div className="text-sm font-bold font-mono text-slate-100">
                {requests.length}
              </div>
              <div className="text-[10px] text-slate-400">Total Requests</div>
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#181b22] border border-[#232732] flex items-center gap-2.5">
            <Folder size={16} className="text-amber-400" />
            <div>
              <div className="text-sm font-bold font-mono text-slate-100">
                {folders.length}
              </div>
              <div className="text-[10px] text-slate-400">Root Folders</div>
            </div>
          </div>
        </div>

        {/* HTTP Method Breakdown */}
        {requests.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-slate-400">
              Method Breakdown
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(methodCounts).map(([method, count]) => {
                const badgeColor = METHOD_COLORS[method] || 'bg-slate-800 text-slate-300 border-slate-700';
                return (
                  <span
                    key={method}
                    className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold flex items-center gap-1.5 ${badgeColor}`}
                  >
                    <span>{method}</span>
                    <span className="opacity-75">({count})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Fast Actions */}
        <div className="pt-2 border-t border-[#232732] space-y-2">
          <div className="text-[11px] font-medium text-slate-400">Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRunCollection}
              className="text-xs justify-start text-slate-300 hover:text-white"
            >
              <Play size={12} className="mr-1.5 text-emerald-400" />
              <span>Run Collection</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddToCanvas}
              className="text-xs justify-start text-slate-300 hover:text-white"
            >
              <Network size={12} className="mr-1.5 text-sky-400" />
              <span>Add to Canvas</span>
            </Button>
            {onExport && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onClose();
                  onExport();
                }}
                className="text-xs justify-start text-slate-300 hover:text-white"
              >
                <Upload size={12} className="mr-1.5 text-slate-400" />
                <span>Export OpenAPI</span>
              </Button>
            )}
            {!isViewer && onNewRequest && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onClose();
                  onNewRequest();
                }}
                className="text-xs justify-start text-slate-300 hover:text-white"
              >
                <Plus size={12} className="mr-1.5 text-sky-400" />
                <span>New Request</span>
              </Button>
            )}
            {!isViewer && onNewFolder && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onClose();
                  onNewFolder();
                }}
                className="text-xs justify-start text-slate-300 hover:text-white"
              >
                <FolderPlus size={12} className="mr-1.5 text-amber-400" />
                <span>New Folder</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

