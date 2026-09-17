import { memo } from 'react';
import { X, Check, Minus, Shield } from 'lucide-react';

const CAPABILITIES = [
  {
    name: 'View workspace & resources',
    description: 'Browse collections, requests, history, and canvas visual graph',
    roles: { OWNER: true, ADMIN: true, MEMBER: true, VIEWER: true },
  },
  {
    name: 'Execute requests & runner',
    description: 'Send API requests, run test suites, and inspect live responses',
    roles: { OWNER: true, ADMIN: true, MEMBER: true, VIEWER: true },
  },
  {
    name: 'Create & edit resources',
    description: 'Create, update, and organize collections, folders, and requests',
    roles: { OWNER: true, ADMIN: true, MEMBER: true, VIEWER: false },
  },
  {
    name: 'Manage environments & variables',
    description: 'Configure active environments, runtime variables, and secret keys',
    roles: { OWNER: true, ADMIN: true, MEMBER: true, VIEWER: false },
  },
  {
    name: 'Invite & manage members',
    description: 'Send invitations, adjust eligible member roles, and remove members',
    roles: { OWNER: true, ADMIN: true, MEMBER: false, VIEWER: false },
  },
  {
    name: 'Manage workspace metadata',
    description: 'Rename workspace and update workspace descriptions',
    roles: { OWNER: true, ADMIN: true, MEMBER: false, VIEWER: false },
  },
  {
    name: 'Delete workspace',
    description: 'Permanently remove the workspace and all underlying data',
    roles: { OWNER: true, ADMIN: false, MEMBER: false, VIEWER: false },
  },
];

function PermissionOverviewModalComponent({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="relative w-full max-w-2xl bg-[#111319] border border-[#232732] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#232732] bg-[#141720]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-sky-950/70 border border-sky-600/40 flex items-center justify-center text-sky-400">
              <Shield size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Workspace Roles & Capabilities</h2>
              <p className="text-[11px] text-slate-400">
                Summary of role permissions enforced across APIForge.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f2430] transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Table */}
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#232732] text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Capability</th>
                <th className="py-2.5 px-2 text-center text-amber-400">Owner</th>
                <th className="py-2.5 px-2 text-center text-sky-400">Admin</th>
                <th className="py-2.5 px-2 text-center text-emerald-400">Member</th>
                <th className="py-2.5 px-2 text-center text-slate-400">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e222d]">
              {CAPABILITIES.map((cap, idx) => (
                <tr key={idx} className="hover:bg-[#141822]/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-200">{cap.name}</div>
                    <div className="text-[10px] text-slate-500">{cap.description}</div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {cap.roles.OWNER ? (
                      <Check size={14} className="mx-auto text-amber-400" />
                    ) : (
                      <Minus size={14} className="mx-auto text-slate-600" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {cap.roles.ADMIN ? (
                      <Check size={14} className="mx-auto text-sky-400" />
                    ) : (
                      <Minus size={14} className="mx-auto text-slate-600" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {cap.roles.MEMBER ? (
                      <Check size={14} className="mx-auto text-emerald-400" />
                    ) : (
                      <Minus size={14} className="mx-auto text-slate-600" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {cap.roles.VIEWER ? (
                      <Check size={14} className="mx-auto text-slate-300" />
                    ) : (
                      <Minus size={14} className="mx-auto text-slate-600" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#232732] bg-[#0e1016] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export const PermissionOverviewModal = memo(PermissionOverviewModalComponent);
export default PermissionOverviewModal;

