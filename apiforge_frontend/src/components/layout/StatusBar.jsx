import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Wifi, WifiOff, Globe, Layers } from 'lucide-react';
import { useWorkspaceQuery } from '../../features/workspace/hooks/useWorkspace';
import { useEnvironmentsQuery } from '../../features/environments/hooks/useEnvironments';

export default function StatusBar({ workspaceId }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { data: workspace } = useWorkspaceQuery(workspaceId);
  const { data: environments = [] } = useEnvironmentsQuery(workspaceId);

  const activeEnv = environments.find((e) => e.isActive);

  const apiHost = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    try {
      return new URL(apiBase, typeof window !== 'undefined' ? window.location.href : undefined).host;
    } catch {
      return 'localhost:5000';
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <footer className="h-6 bg-[#111318] border-t border-[#232732] px-3 flex items-center justify-between text-[11px] text-[#5e6676] select-none font-mono">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={11} />
              <span className="text-slate-400">Ready</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-rose-400">
              <WifiOff size={11} />
              <span>Offline</span>
            </div>
          )}
        </div>

        {workspace && (
          <div className="flex items-center gap-1 text-slate-400">
            <Layers size={11} className="text-slate-500" />
            <span className="truncate max-w-[120px]">{workspace.name}</span>
          </div>
        )}

        {workspaceId && (
          <div className="flex items-center gap-1 text-slate-400">
            <Globe size={11} className={activeEnv ? 'text-sky-400' : 'text-slate-500'} />
            <span className="truncate max-w-[120px]">
              {activeEnv ? activeEnv.name : 'No Environment'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Wifi size={11} className="text-slate-500" />
          <span>{apiHost}</span>
        </div>
        <span className="text-slate-400">APIForge v1.0.0</span>
      </div>
    </footer>
  );
}
