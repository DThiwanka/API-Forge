import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layers, Terminal, AlertCircle, CheckCircle2, UserCheck, LogIn, Loader2 } from 'lucide-react';
import { useValidateInvitationQuery, useAcceptInvitationMutation } from '../../features/collaboration/hooks/useCollaboration';
import { useCurrentUser } from '../../features/auth/hooks/useAuth';

export default function InvitationAcceptancePage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: invitation, isLoading: loadingInvitation, error: validationError } = useValidateInvitationQuery(token);
  const acceptMutation = useAcceptInvitationMutation();

  const handleAccept = () => {
    acceptMutation.mutate(token, {
      onSuccess: (data) => {
        navigate(`/workspace/${data.workspaceId}`);
      },
    });
  };

  if (loadingInvitation || loadingUser) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center p-4 text-slate-400">
        <Loader2 size={24} className="animate-spin text-sky-500 mb-3" />
        <span className="text-xs font-mono">Validating invitation...</span>
      </div>
    );
  }

  // Error / Invalid invitation state
  if (validationError || !invitation) {
    const errorMsg =
      validationError?.response?.data?.message ||
      'This invitation link is invalid, has expired, or has already been used.';

    return (
      <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="w-full max-w-md p-6 bg-[#111319] border border-[#232732] rounded-xl shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400">
            <AlertCircle size={24} />
          </div>
          <h1 className="text-base font-bold text-slate-100">Invalid or Expired Invitation</h1>
          <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              <span>Back to APIForge</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isEmailMatch =
    currentUser &&
    currentUser.email &&
    currentUser.email.trim().toLowerCase() === invitation.email.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center p-4 text-slate-200">
      {/* Brand Header */}
      <div className="mb-6 flex items-center gap-2 text-slate-100">
        <div className="w-8 h-8 rounded bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400 shadow-sm">
          <Terminal size={18} />
        </div>
        <span className="font-bold text-sm tracking-wider uppercase">APIForge</span>
      </div>

      <div className="w-full max-w-md bg-[#111319] border border-[#232732] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Card Header */}
        <div className="p-6 border-b border-[#232732] text-center space-y-2 bg-[#141720]">
          <div className="w-12 h-12 mx-auto rounded-xl bg-sky-950/60 border border-sky-600/40 flex items-center justify-center text-sky-400 mb-3 shadow-sm">
            <Layers size={22} />
          </div>
          <h2 className="text-base font-bold text-slate-100 tracking-tight">
            Join {invitation.workspaceName}
          </h2>
          {invitation.workspaceDescription && (
            <p className="text-xs text-slate-400 max-w-sm mx-auto line-clamp-2">
              {invitation.workspaceDescription}
            </p>
          )}
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          <div className="p-3.5 bg-[#0b0d13] border border-[#232732] rounded-lg space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Invited Email</span>
              <span className="font-mono text-slate-200 font-semibold">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Assigned Role</span>
              <span className="font-mono px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-sky-950/40 border border-sky-800/40 text-sky-400">
                {invitation.role}
              </span>
            </div>
            {invitation.invitedBy && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Invited By</span>
                <span className="text-slate-300">{invitation.invitedBy.name || invitation.invitedBy.email}</span>
              </div>
            )}
          </div>

          {/* Conditional Action based on auth state */}
          {!currentUser ? (
            /* Unauthenticated -> prompt to sign in */
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 text-center">
                Please sign in with <span className="font-mono text-slate-200 font-semibold">{invitation.email}</span> to accept this invitation.
              </p>
              <Link
                to={`/login?returnUrl=/invite/${token}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-xs"
              >
                <LogIn size={13} />
                <span>Sign In to Accept</span>
              </Link>
            </div>
          ) : !isEmailMatch ? (
            /* Email mismatch error state */
            <div className="space-y-3">
              <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                  <AlertCircle size={13} />
                  <span>Email Mismatch</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  You are currently signed in as <span className="font-mono font-semibold text-white">{currentUser.email}</span>, but this invitation was sent to <span className="font-mono font-semibold text-white">{invitation.email}</span>.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  to={`/login?returnUrl=/invite/${token}`}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-[#1c212c] hover:bg-[#252b39] border border-[#2b313e] text-slate-200 text-xs transition-colors"
                >
                  <LogIn size={12} />
                  <span>Sign in with different account</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Matching account -> Accept invitation */
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-emerald-300 text-[11px]">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                <span>Signed in as {currentUser.email}</span>
              </div>

              <button
                type="button"
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Joining Workspace...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={14} />
                    <span>Accept Invitation & Join</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

