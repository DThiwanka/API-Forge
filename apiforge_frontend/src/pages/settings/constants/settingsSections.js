import {
  User,
  Briefcase,
  Palette,
  Sliders,
  Globe,
  Users,
  Shield,
  Keyboard,
} from 'lucide-react';

export const SETTINGS_SECTIONS = [
  { id: 'account', label: 'Account Profile', icon: User, scope: 'account' },
  { id: 'workspace', label: 'Workspace', icon: Briefcase, scope: 'workspace' },
  { id: 'appearance', label: 'Appearance', icon: Palette, scope: 'account' },
  { id: 'editor', label: 'Editor & Developer', icon: Sliders, scope: 'account' },
  { id: 'environments', label: 'Environments', icon: Globe, scope: 'workspace' },
  { id: 'members', label: 'Members & Roles', icon: Users, scope: 'workspace' },
  { id: 'security', label: 'Security', icon: Shield, scope: 'account' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard, scope: 'account' },
];

export default SETTINGS_SECTIONS;

