import { Layers, Trash2, X, ExternalLink, LayoutGrid } from 'lucide-react';
import useCanvasStore from '../store/canvasStore';
import useRequestTabStore from '../../requests/store/requestTabStore';
import { useResourceNavigation } from '../../../hooks/useResourceNavigation';
import { toast } from '../../../stores/toastStore';

export default function CanvasSelectionToolbar({ workspaceId, collections = [], onSaveLayout }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const deleteSelectedNodes = useCanvasStore((s) => s.deleteSelectedNodes);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const arrangeNodes = useCanvasStore((s) => s.arrangeNodes);
  const openTab = useRequestTabStore((s) => s.openTab);
  const { batchOpenRequests } = useResourceNavigation(workspaceId);

  const selectedNodes = nodes.filter((n) => n.selected);
  const count = selectedNodes.length;

  if (count <= 1) return null;

  const handleOpenAllInTabs = () => {
    if (!workspaceId) return;
    let opened = 0;
    selectedNodes.forEach((node) => {
      const data = node.data;
      if (data?.requestId && data?.collectionId) {
        openTab({
          workspaceId,
          collectionId: data.collectionId,
          requestId: data.requestId,
          title: data.name,
          method: data.method,
          url: data.url,
        });
        opened++;
      }
    });
    const reqsToOpen = selectedNodes
      .filter((node) => node.data?.requestId && node.data?.collectionId)
      .map((node) => ({
        id: node.data.requestId,
        collectionId: node.data.collectionId,
        name: node.data.name,
        method: node.data.method,
        url: node.data.url,
      }));

    const opened = batchOpenRequests(reqsToOpen);
    toast.success(`Opened ${opened} ${opened === 1 ? 'tab' : 'tabs'} in Request Workspace`);
  };

  const handleArrange = () => {
    arrangeNodes(collections);
    if (onSaveLayout) onSaveLayout();
    toast.info('Arranged canvas nodes into grid');
  };

  const handleDelete = () => {
    deleteSelectedNodes();
    if (onSaveLayout) onSaveLayout();
    toast.info(`Removed ${count} nodes from canvas`);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111318]/95 border border-[#2b313e] shadow-2xl backdrop-blur-md text-xs select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300 pr-2 border-r border-[#232732]">
        <Layers size={13} className="text-sky-400" />
        <span className="font-semibold text-white">{count}</span>
        <span>selected</span>
      </div>

      <button
        type="button"
        onClick={handleOpenAllInTabs}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181b22] hover:bg-[#222733] text-slate-200 hover:text-white border border-[#2d3342] transition-colors cursor-pointer"
        title="Open all selected requests into workspace tabs"
      >
        <ExternalLink size={12} className="text-sky-400" />
        <span>Open in Tabs</span>
      </button>

      <button
        type="button"
        onClick={handleArrange}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181b22] hover:bg-[#222733] text-slate-200 hover:text-white border border-[#2d3342] transition-colors cursor-pointer"
        title="Arrange nodes neatly"
      >
        <LayoutGrid size={12} className="text-purple-400" />
        <span>Arrange</span>
      </button>

      <button
        type="button"
        onClick={handleDelete}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181b22] hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-[#2d3342] hover:border-rose-800/40 transition-colors cursor-pointer"
        title="Delete selected nodes from canvas"
      >
        <Trash2 size={12} />
        <span>Remove</span>
      </button>

      <button
        type="button"
        onClick={clearSelection}
        className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-[#222733] transition-colors ml-0.5"
        title="Clear selection (Esc)"
      >
        <X size={13} />
      </button>
    </div>
  );
}

