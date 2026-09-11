import { Link } from 'react-router-dom';
import { Terminal, Activity, Layers } from 'lucide-react';

export default function TopBar() {
  return (
    <header className="h-11 bg-[#111318] border-b border-[#232732] px-3 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-slate-100 hover:text-sky-400 transition-colors">
          <div className="w-6 h-6 rounded bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400">
            <Terminal size={14} />
          </div>
          <span className="font-semibold text-xs tracking-wider uppercase">APIForge</span>
        </Link>
        <div className="h-4 w-px bg-[#232732]" />
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#181b22] border border-[#232732] text-[11px] text-slate-300">
          <Layers size={12} className="text-slate-500" />
          <span className="font-medium">Request Workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#181b22] border border-[#232732] text-[11px] text-slate-400">
          <Activity size={11} className="text-emerald-500" />
          <span>Execution Engine Online</span>
        </div>
        <Link
          to="/login"
          className="px-2.5 py-1 text-xs text-slate-300 hover:text-white rounded hover:bg-[#181b22] transition-colors"
        >
          Sign In
        </Link>
      </div>
    </header>
  );
}
