import React from 'react';
import { Globe, Cpu, ArrowRightLeft, Lock } from 'lucide-react';
import { cn } from '../../../utils/cn';


const SOURCE_CONFIG = {
  environment: {
    label: 'ENV',
    fullLabel: 'Environment',
    icon: Globe,
    badgeClass: 'bg-sky-950/50 text-sky-400 border-sky-800/40',
    iconClass: 'text-sky-400',
  },
  runtime: {
    label: 'RUN',
    fullLabel: 'Runtime',
    icon: Cpu,
    badgeClass: 'bg-purple-950/50 text-purple-300 border-purple-800/40',
    iconClass: 'text-purple-400',
  },
  extracted: {
    label: 'EXT',
    fullLabel: 'Extracted',
    icon: ArrowRightLeft,
    badgeClass: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40',
    iconClass: 'text-emerald-400',
  },
};

export default function VariableSourceBadge({
  source = 'environment',
  isSecret = false,
  showLabel = true,
  short = false,
  className,
}) {
  const normSource = String(source || 'environment').toLowerCase();
  const config = SOURCE_CONFIG[normSource] || SOURCE_CONFIG.environment;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium select-none',
        config.badgeClass,
        className
      )}
      title={`${config.fullLabel} variable${isSecret ? ' (Secret)' : ''}`}
    >
      <Icon size={10} className={config.iconClass} />
      {showLabel && <span>{short ? config.label : config.fullLabel}</span>}
      {isSecret && (
        <span className="flex items-center text-amber-400 ml-0.5" title="Secret variable">
          <Lock size={9} />
        </span>
      )}
    </span>
  );
}
