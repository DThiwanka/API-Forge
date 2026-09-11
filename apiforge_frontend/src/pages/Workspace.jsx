import React from 'react';
import AppShell from '../components/layout/AppShell';
import { Layers, Terminal, Sparkles } from 'lucide-react';

export default function Workspace() {
  return (
    <AppShell>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[radial-gradient(#1a1d26_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="w-12 h-12 rounded-lg bg-[#111318] border border-[#232732] flex items-center justify-center text-sky-400 mb-4 shadow-xl">
          <Layers size={22} />
        </div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">
          APIForge Workspace Foundation
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          The foundation shell is active. API Canvas, request engine, and collections will be loaded here in subsequent development steps.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111318] border border-[#232732] text-[11px] text-slate-400 font-mono">
          <Terminal size={12} className="text-sky-400" />
          <span>AppShell mounted • Ready for Step 2</span>
        </div>
      </div>
    </AppShell>
  );
}
