import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { useEnvironmentsQuery, useActivateEnvironmentMutation } from '../hooks/useEnvironments';
import { cn } from '../../../utils/cn';

export default function EnvironmentSwitcher({ workspaceId, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { data: environments = [], isLoading } = useEnvironmentsQuery(workspaceId);
  const activateMutation = useActivateEnvironmentMutation(workspaceId);

  const activeEnv = environments.find((env) => env.isActive);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (envId) => {
    activateMutation.mutate(envId);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-200 transition-colors focus:outline-none focus:border-sky-500"
        title="Active Environment"
      >
        <Globe size={13} className={activeEnv ? 'text-sky-400' : 'text-slate-500'} />
        <span className="font-medium truncate max-w-[140px]">
          {isLoading ? 'Loading...' : activeEnv ? activeEnv.name : 'No Environment'}
        </span>
        <ChevronDown size={12} className="text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-[#181b22] border border-[#2b313e] rounded-md shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-[#2b313e] flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Environments</span>
            {environments.length > 0 && (
              <span className="text-slate-500 text-[10px] lowercase font-normal">
                {environments.length} available
              </span>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {environments.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 text-center">
                No environments configured
              </div>
            ) : (
              environments.map((env) => {
                const isActive = env.isActive;
                return (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() => handleSelect(env.id)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors hover:bg-[#232732]',
                      isActive ? 'text-sky-400 font-medium bg-[#1e2330]' : 'text-slate-300'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{env.name}</span>
                      {env.variableCount !== undefined && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({env.variableCount} vars)
                        </span>
                      )}
                    </div>
                    {isActive && <Check size={13} className="text-sky-400 flex-shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

