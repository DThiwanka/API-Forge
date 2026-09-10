import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, ArrowRight, LayoutDashboard, ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#090a0f] text-[#f0f2f5] flex flex-col">
      <header className="h-14 border-b border-[#232732] px-6 flex items-center justify-between bg-[#111318]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400">
            <Terminal size={16} />
          </div>
          <span className="font-bold text-sm tracking-wider uppercase">APIForge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded hover:bg-[#181b22] transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/workspace"
            className="px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors flex items-center gap-1.5"
          >
            Open Workspace <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-800/40 text-sky-400 text-xs font-mono mb-6">
          <Zap size={12} />
          <span>Next-Gen API Development Engine</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4 sm:text-5xl">
          Craft, Test, and Orchestrate APIs with Precision
        </h1>
        <p className="text-base text-slate-400 max-w-xl mb-8 leading-relaxed">
          A spatial, developer-first workspace engineered for modern API design, debugging, and testing.
        </p>

        <div className="flex items-center gap-4">
          <Link
            to="/workspace"
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md font-medium text-sm transition-colors flex items-center gap-2 shadow-lg shadow-sky-950"
          >
            <LayoutDashboard size={16} />
            Launch Workspace
          </Link>
          <Link
            to="/login"
            className="px-5 py-2.5 bg-[#181b22] hover:bg-[#222630] text-slate-200 border border-[#232732] rounded-md font-medium text-sm transition-colors"
          >
            Sign In
          </Link>
        </div>
      </main>

      <footer className="h-10 border-t border-[#232732] px-6 flex items-center justify-center text-xs text-slate-600 font-mono">
        APIForge Foundation Layer • Step 1
      </footer>
    </div>
  );
}
