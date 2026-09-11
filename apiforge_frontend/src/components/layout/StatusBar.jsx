import { CheckCircle2, Cpu, Wifi } from 'lucide-react';

export default function StatusBar() {
  return (
    <footer className="h-6 bg-[#111318] border-t border-[#232732] px-3 flex items-center justify-between text-[11px] text-[#5e6676] select-none font-mono">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-emerald-500">
          <CheckCircle2 size={11} />
          <span className="text-slate-400">Ready</span>
        </div>
        <div className="flex items-center gap-1">
          <Wifi size={11} />
          <span>http://localhost:5000</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Cpu size={11} />
          <span>Engine: Active</span>
        </div>
        <span>APIForge v0.1.0</span>
      </div>
    </footer>
  );
}
