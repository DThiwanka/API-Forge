import { memo } from 'react';
import { cn } from '../../../utils/cn';

const ROLE_OPTIONS = [
  {
    role: 'ADMIN',
    label: 'Admin',
    description: 'Can manage workspace members, collections, and settings.',
  },
  {
    role: 'MEMBER',
    label: 'Member',
    description: 'Can create and edit collections, requests, and environments.',
  },
  {
    role: 'VIEWER',
    label: 'Viewer',
    description: 'Read-only access to collections, requests, and canvas.',
  },
];

function PermissionSelectorComponent({
  value,
  onChange,
  disabled = false,
  currentUserRole = 'ADMIN',
  className = '',
}) {
  // Filter selectable options based on inviter/manager permissions
  const availableOptions = ROLE_OPTIONS.filter((opt) => {
    if (currentUserRole === 'OWNER') return true;
    if (currentUserRole === 'ADMIN') return opt.role !== 'OWNER';
    return false;
  });

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'bg-[#12151e] border border-[#262c3b] rounded text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {availableOptions.map((opt) => (
        <option key={opt.role} value={opt.role} className="bg-[#12151e] text-slate-200">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export const PermissionSelector = memo(PermissionSelectorComponent);
export default PermissionSelector;

