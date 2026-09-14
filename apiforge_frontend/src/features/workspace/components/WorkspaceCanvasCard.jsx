import { useNavigate } from 'react-router-dom';
import { Network, ArrowUpRight } from 'lucide-react';
import useCanvasStore from '../../canvas/store/canvasStore';

export default function WorkspaceCanvasCard({ workspaceId }) {
  const navigate = useNavigate();

  const nodes = useCanvasStore((s) => s.nodes) || [];
  const edges = useCanvasStore((s) => s.edges) || [];

  const totalNodes = nodes.length;
  const requestNodesCount = nodes.filter((n) => n.type === 'requestNode').length;
  const connectionsCount = edges.length;

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#13151f] to-[#171926] border border-[#262c3d] rounded-xl p-4 shadow-sm relative overflow-hidden group">
      {/* Subtle background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-600/15 transition-colors" />

      <div className="flex items-start justify-between gap-3 mb-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400">
            <Network size={17} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 font-mono tracking-wide uppercase">
              API Canvas
            </h3>
            <span className="text-[11px] text-slate-400">Spatial API Architecture</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/workspace/${workspaceId}/canvas`)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
        >
          <span>Open</span>
          <ArrowUpRight size={12} />
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-3 leading-relaxed relative z-10">
        Visualize endpoint dependencies, orchestrate requests, and design API workflows visually.
      </p>

      {/* Stats row if canvas has content */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#232738] relative z-10 text-[11px] font-mono">
        <div className="flex flex-col">
          <span className="text-slate-400 text-[10px]">Nodes</span>
          <span className="text-slate-200 font-semibold">{totalNodes}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-[10px]">Requests</span>
          <span className="text-slate-200 font-semibold">{requestNodesCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-[10px]">Links</span>
          <span className="text-slate-200 font-semibold">{connectionsCount}</span>
        </div>
      </div>
    </div>
  );
}
