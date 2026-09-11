import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#090a0f] text-[#f0f2f5] flex flex-col items-center justify-center p-4">
      <div className="w-12 h-12 rounded-lg bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-4">
        <AlertCircle size={22} />
      </div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">404 - Page Not Found</h1>
      <p className="text-xs text-slate-500 mb-6">The requested path does not exist in APIForge.</p>
      <Link
        to="/"
        className="px-4 py-2 bg-[#181b22] hover:bg-[#222630] border border-[#232732] text-xs font-medium text-slate-200 rounded transition-colors flex items-center gap-1.5"
      >
        <ArrowLeft size={13} />
        Return Home
      </Link>
    </div>
  );
}
