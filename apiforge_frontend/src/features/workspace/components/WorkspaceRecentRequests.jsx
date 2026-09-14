import { useNavigate } from 'react-router-dom';
import { History, ExternalLink, FileCode } from 'lucide-react';
import useRequestTabStore from '../../requests/store/requestTabStore';
import { METHOD_STYLES } from '../../history/utils/historyHelpers';
import { cn } from '../../../utils/cn';

export default function WorkspaceRecentRequests({ workspaceId }) {
  const navigate = useNavigate();

  const tabs = useRequestTabStore((s) => s.tabsByWorkspace[workspaceId] || []);
  const historyIds = useRequestTabStore((s) => s.historyByWorkspace[workspaceId] || []);

  // Build MRU list of recent requests
  // Start from historyIds in reverse, map to tab metadata
  const recentRequests = [];
  const seenIds = new Set();

  for (let i = historyIds.length - 1; i >= 0; i--) {
    const rId = historyIds[i];
    if (!seenIds.has(rId)) {
      seenIds.add(rId);
      const matchingTab = tabs.find((t) => t.requestId === rId);
      if (matchingTab) {
        recentRequests.push(matchingTab);
      }
    }
  }

  // If some tabs aren't in historyIds yet, append them
  for (const tab of tabs) {
    if (!seenIds.has(tab.requestId)) {
      seenIds.add(tab.requestId);
      recentRequests.push(tab);
    }
  }

  const handleOpenRequest = (tab) => {
    if (tab.collectionId && tab.requestId) {
      navigate(
        `/workspace/${workspaceId}/collections/${tab.collectionId}/requests/${tab.requestId}`
      );
    }
  };

  return (
    <div className="flex flex-col bg-[#11131a] border border-[#232732] rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f232e] bg-[#141721]">
        <div className="flex items-center gap-2">
          <History size={15} className="text-emerald-400" />
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Recent Requests
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c202d] text-slate-400 border border-[#2a3040]">
            {recentRequests.length}
          </span>
        </div>
      </div>

      {/* Body / List */}
      <div className="divide-y divide-[#1b1f29] min-h-[140px] flex flex-col justify-center">
        {recentRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <FileCode size={22} className="text-slate-600 mb-2" />
            <span className="text-xs font-medium text-slate-300">No recent requests</span>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Requests opened in the editor will appear here for fast tab access.
            </p>
          </div>
        ) : (
          recentRequests.slice(0, 6).map((tab) => {
            const method = (tab.method || 'GET').toUpperCase();
            const methodStyle =
              METHOD_STYLES[method] || 'text-slate-400 bg-slate-800/40 border-slate-700/40';

            return (
              <div
                key={tab.requestId}
                onClick={() => handleOpenRequest(tab)}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#151924] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wider shrink-0',
                      methodStyle
                    )}
                  >
                    {method}
                  </span>

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-medium text-slate-200 truncate group-hover:text-sky-300 transition-colors">
                      {tab.title || 'Untitled Request'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-md">
                      {tab.url || 'No URL configured'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Open <ExternalLink size={11} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

