import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Sparkles, FolderPlus, Globe, Shield } from 'lucide-react';
import CreateWorkspaceDialog from './CreateWorkspaceDialog';

export default function FirstWorkspaceOnboarding() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleSuccess = (createdWorkspace) => {
    if (createdWorkspace?.id) {
      navigate(`/workspace/${createdWorkspace.id}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center select-none bg-[#090a0f] min-h-[500px]">
      <div className="w-full max-w-md flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        {/* Workspace Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-[#111318] border border-sky-600/30 flex items-center justify-center text-sky-400 mb-6 shadow-2xl shadow-sky-950/50">
          <Layers size={30} className="stroke-[1.75]" />
        </div>

        {/* Heading & Subtext */}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mb-3">
          Welcome to APIForge
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed max-w-sm mb-8">
          Create your first workspace to start building and testing APIs.
        </p>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-sm font-medium shadow-lg shadow-sky-950/80 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 group"
        >
          <Plus size={16} className="transition-transform group-hover:scale-110" />
          <span>Create Workspace</span>
        </button>

        {/* Context cards explaining what a workspace holds */}
        <div className="mt-12 pt-8 border-t border-[#1e2330] w-full grid grid-cols-3 gap-3 text-left">
          <div className="p-3 rounded-md bg-[#111318]/60 border border-[#232732]/60">
            <FolderPlus size={14} className="text-sky-400 mb-1.5" />
            <div className="text-[11px] font-medium text-slate-200">Collections</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Group API requests hierarchically</div>
          </div>
          <div className="p-3 rounded-md bg-[#111318]/60 border border-[#232732]/60">
            <Globe size={14} className="text-emerald-400 mb-1.5" />
            <div className="text-[11px] font-medium text-slate-200">Environments</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Scoped runtime variables</div>
          </div>
          <div className="p-3 rounded-md bg-[#111318]/60 border border-[#232732]/60">
            <Shield size={14} className="text-amber-400 mb-1.5" />
            <div className="text-[11px] font-medium text-slate-200">Isolation</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Secure role-based boundaries</div>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      <CreateWorkspaceDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

