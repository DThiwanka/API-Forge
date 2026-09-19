import { useState } from 'react';
import { useCurrentUser, useLogoutMutation } from '../../../features/auth/hooks/useAuth';
import { formatDate } from '../../../utils/formatDate';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { User, Mail, Hash, Calendar, LogOut, ShieldCheck } from 'lucide-react';

export default function AccountSettings() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const logoutMutation = useLogoutMutation();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-[#181b22] rounded" />
        <div className="h-32 bg-[#14171f] border border-[#232732] rounded-lg" />
      </div>
    );
  }

  const handleLogoutConfirm = () => {
    logoutMutation.mutate();
    setIsLogoutOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-100 tracking-wide">Account Profile</h2>
        <p className="text-xs text-slate-400 mt-1">
          Your personal account identity and authentication session details.
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400 font-bold text-lg shadow-sm">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-100">
              {currentUser?.name || 'Unnamed User'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {currentUser?.email || 'No email configured'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#232732]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User size={13} />
              <span>Display Name</span>
            </div>
            <div className="text-xs font-medium text-slate-200 bg-[#0d0f14] p-2 rounded border border-[#232732]">
              {currentUser?.name || '-'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Mail size={13} />
              <span>Email Address</span>
            </div>
            <div className="text-xs font-mono text-slate-200 bg-[#0d0f14] p-2 rounded border border-[#232732]">
              {currentUser?.email || '-'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Hash size={13} />
              <span>User ID</span>
            </div>
            <div className="text-xs font-mono text-slate-400 bg-[#0d0f14] p-2 rounded border border-[#232732] truncate">
              {currentUser?.id || '-'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar size={13} />
              <span>Member Since</span>
            </div>
            <div className="text-xs font-medium text-slate-300 bg-[#0d0f14] p-2 rounded border border-[#232732]">
              {currentUser?.createdAt ? formatDate(currentUser.createdAt) : 'Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Active Session</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              You are currently authenticated via secure HTTP-only cookies.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsLogoutOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/60 text-rose-300 hover:text-rose-200 text-xs font-medium transition-all cursor-pointer shadow-sm"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your APIForge account?"
        confirmLabel="Sign Out"
        variant="danger"
        isLoading={logoutMutation.isPending}
      />
    </div>
  );
}
