import { memo } from 'react';
import { cn } from '../../../utils/cn';

const ROLE_DEFINITIONS = [
  {
    role: 'OWNER',
    label: 'Owner',
    description: 'Full workspace control',
    detail: 'Full workspace control including membership and settings.',
  },
  {
    role: 'ADMIN',
    label: 'Admin',
    description: 'Manage workspace resources and members',
    detail: 'Can manage workspace members, collections, requests, and settings.',
  },
  {
    role: 'MEMBER',
    label: 'Member',
    description: 'Create and modify workspace resources',
    detail: 'Can create and edit collections, requests, and environments.',
  },
  {
    role: 'VIEWER',
    label: 'Viewer',
    description: 'View workspace resources',
    detail: 'Read-only access to view and execute collections and requests.',
  },
];

function PermissionSelectorComponent({
  value,
  onChange,
  disabled = false,
  currentUserRole = 'ADMIN',
  className = '',
  includeOwner = false,
}) {
  // Filter selectable options based on user role
  const availableOptions = ROLE_DEFINITIONS.filter((opt) => {
    if (opt.role === 'OWNER') return includeOwner && currentUserRole === 'OWNER';
    if (currentUserRole === 'OWNER') return true;
    if (currentUserRole === 'ADMIN') return opt.role !== 'OWNER';
    return false;
  });

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      title={ROLE_DEFINITIONS.find((r) => r.role === value)?.description || 'Select workspace role'}
      className={cn(
        'bg-[#12151e] border border-[#262c3b] rounded text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {availableOptions.map((opt) => (
        <option
          key={opt.role}
          value={opt.role}
          title={opt.detail}
          className="bg-[#12151e] text-slate-200 py-1"
        >
          {opt.label} — {opt.description}
        </option>
      ))}
    </select>
  );
}

export const PermissionSelector = memo(PermissionSelectorComponent);
export default PermissionSelector;
