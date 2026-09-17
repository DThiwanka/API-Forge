import { useState } from 'react';
import { X, Send, Copy, Check, UserPlus, AlertCircle, Info } from 'lucide-react';
import PermissionSelector from './PermissionSelector';
import { useInviteMemberMutation } from '../hooks/useCollaboration';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteMemberDialog({
  isOpen,
  onClose,
  workspaceId,
  currentUserRole = 'ADMIN',
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [error, setError] = useState(null);
  const [createdInvite, setCreatedInvite] = useState(null);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);

  const inviteMutation = useInviteMemberMutation(workspaceId);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter an email address');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    inviteMutation.mutate(
      { email: trimmedEmail, role },
      {
        onSuccess: (data) => {
          setCreatedInvite(data);
          setEmail('');
        },
        onError: (err) => {
          setError(err.response?.data?.message || 'Failed to send invitation');
        },
      }
    );
  };

  const handleCopyLink = async () => {
    if (!createdInvite?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(createdInvite.inviteUrl);
      setHasCopiedUrl(true);
      setTimeout(() => setHasCopiedUrl(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('MEMBER');
    setError(null);
    setCreatedInvite(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-md bg-[#111319] border border-[#232732] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#232732] bg-[#141720]">
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <UserPlus size={15} className="text-sky-400" />
            <span>Invite to Workspace</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f2430] transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {createdInvite ? (
            /* Success confirmation with invitation link preview */
            <div className="space-y-3.5">
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-emerald-400">Invitation Generated!</div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  An invitation has been created for{' '}
                  <span className="font-mono font-semibold text-white">{createdInvite.invitation.email}</span> with role{' '}
                  <span className="font-mono font-semibold text-white">{createdInvite.invitation.role}</span>.
                </p>
              </div>

              {createdInvite.inviteUrl && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-400">Direct Invitation Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdInvite.inviteUrl}
                      className="flex-1 px-2.5 py-1.5 bg-[#0b0d13] border border-[#232732] rounded font-mono text-[11px] text-slate-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex items-center gap-1 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors cursor-pointer shrink-0"
                    >
                      {hasCopiedUrl ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
                      <span>{hasCopiedUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Info size={11} />
                    <span>The recipient will need to sign in with this email to accept.</span>
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreatedInvite(null)}
                  className="px-3 py-1.5 rounded bg-[#1e2330] hover:bg-[#252b3b] text-slate-200 transition-colors cursor-pointer"
                >
                  Invite Another
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Invite form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-800/50 rounded text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={13} className="shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  autoFocus
                  required
                  className="w-full px-3 py-1.5 bg-[#0c0e14] border border-[#232732] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-400">Assigned Role</label>
                <PermissionSelector
                  value={role}
                  onChange={setRole}
                  currentUserRole={currentUserRole}
                  className="w-full py-1.5"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#1e222d]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1a1d27] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium transition-colors cursor-pointer shadow-xs"
                >
                  <Send size={12} />
                  <span>{inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

