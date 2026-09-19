import { useState } from 'react';
import { useCurrentUser, useLogoutMutation } from '../../../features/auth/hooks/useAuth';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { KeyRound, Lock, LogOut, CheckCircle2 } from 'lucide-react';

export default function SecuritySettingsSection() {
  const { data: currentUser } = useCurrentUser();
  const logoutMutation = useLogoutMutation();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-100 tracking-wide">Security & Authentication</h2>
        <p className="text-xs text-slate-400 mt-1">
          Security architecture guarantees, active session information, and session revocation.
        </p>
      </div>

      {/* Security Architecture Guarantees */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">Architectural Protections</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            APIForge operates with defense-in-depth zero-trust security policies.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-md bg-[#0d1017] border border-[#1e2330]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-medium text-slate-200">HTTP-Only SameSite Cookie Authentication</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Authentication tokens and refresh tokens are strictly stored in HTTP-only, SameSite=Strict cookies, immune to JavaScript XSS theft.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md bg-[#0d1017] border border-[#1e2330]">
            <Lock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-medium text-slate-200">SSRF & Loopback Proxy Guards</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Proxy execution blocks unauthorized internal subnet scans, AWS metadata endpoints (169.254.169.254), and loopback attacks.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md bg-[#0d1017] border border-[#1e2330]">
            <KeyRound className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-medium text-slate-200">Zero Secret Leakage in Presentation Layer</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Environment secret variables and authentication passwords are encrypted at rest and never returned in UI audit logs or serialized store states.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-slate-200">Terminate Active Session</h3>
          <p className="text-[11px] text-slate-400 max-w-md">
            Clears HTTP-only cookies and revokes refresh tokens on the server for {currentUser?.email || 'this account'}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLogoutOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-rose-600/15 border border-rose-500/30 text-rose-400 hover:bg-rose-600/25 text-xs font-medium transition-colors shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Logout Confirmation */}
      <ConfirmDialog
        isOpen={isLogoutOpen}
        title="Sign Out"
        message="Are you sure you want to end your current session? You will be redirected to the login screen."
        confirmText="Sign Out"
        cancelText="Stay Signed In"
        isDanger={false}
        isLoading={logoutMutation.isPending}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutOpen(false)}
      />
    </div>
  );
}
