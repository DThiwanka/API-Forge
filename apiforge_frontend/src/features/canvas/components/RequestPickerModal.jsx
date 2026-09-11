import { useState, useMemo, useEffect } from 'react';
import { Search, X, Layers, Plus, Check } from 'lucide-react';
import { getMethodStyle } from '../utils/nodeHelpers';
import useCanvasStore from '../store/canvasStore';
import { cn } from '../../../utils/cn';

export default function RequestPickerModal({
  isOpen,
  onClose,
  allRequests = [],
  collections = [],
  onSelectRequest,
  onAddCollection,
}) {
  if (!isOpen) return null;

  return (
    <RequestPickerContent
      onClose={onClose}
      allRequests={allRequests}
      collections={collections}
      onSelectRequest={onSelectRequest}
      onAddCollection={onAddCollection}
    />
  );
}

function RequestPickerContent({
  onClose,
  allRequests = [],
  collections = [],
  onSelectRequest,
  onAddCollection,
}) {
  const [search, setSearch] = useState('');
  const nodes = useCanvasStore((s) => s.nodes);

  const existingNodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Group requests by collection
  const filteredAndGrouped = useMemo(() => {
    const query = search.trim().toLowerCase();
    const map = new Map();

    collections.forEach((col) => {
      map.set(col.id, {
        collection: col,
        requests: [],
      });
    });

    allRequests.forEach((req) => {
      const matches =
        !query ||
        req.name?.toLowerCase().includes(query) ||
        req.url?.toLowerCase().includes(query) ||
        req.method?.toLowerCase().includes(query);

      if (matches) {
        if (!map.has(req.collectionId)) {
          map.set(req.collectionId, {
            collection: { id: req.collectionId, name: req.collectionName || 'Collection' },
            requests: [],
          });
        }
        map.get(req.collectionId).requests.push(req);
      }
    });

    return Array.from(map.values()).filter((group) => group.requests.length > 0);
  }, [allRequests, collections, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-xl rounded-xl bg-[#14171f] border border-[#2b313e] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#232732] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Plus size={16} className="text-sky-400" />
            <span>Add Request to Canvas</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#232732] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-[#232732] bg-[#111318]">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests by name, method, or URL..."
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#181b22] border border-[#2b313e] focus:border-sky-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500 font-sans"
            />
          </div>
        </div>

        {/* Request List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {filteredAndGrouped.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              {search ? 'No requests match your search' : 'No requests available in workspace'}
            </div>
          ) : (
            filteredAndGrouped.map(({ collection, requests }) => {
              const allInCollectionOnCanvas = requests.every((r) => existingNodeIds.has(r.id));

              return (
                <div key={collection.id} className="space-y-1.5">
                  {/* Collection Header */}
                  <div className="flex items-center justify-between px-2 py-1 bg-[#111318]/70 rounded border border-[#1f242e] text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-300">
                      <Layers size={13} className="text-sky-400" />
                      <span>{collection.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        ({requests.length})
                      </span>
                    </div>

                    {onAddCollection && !allInCollectionOnCanvas && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddCollection(collection.id);
                          onClose();
                        }}
                        className="text-[10px] font-mono text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
                      >
                        <Plus size={11} />
                        <span>Add All</span>
                      </button>
                    )}
                  </div>

                  {/* Requests in Collection */}
                  <div className="space-y-1">
                    {requests.map((req) => {
                      const isOnCanvas = existingNodeIds.has(req.id);
                      const methodStyle = getMethodStyle(req.method);

                      return (
                        <div
                          key={req.id}
                          onClick={() => {
                            onSelectRequest(req);
                            onClose();
                          }}
                          className={cn(
                            'px-3 py-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer',
                            isOnCanvas
                              ? 'bg-[#181b22]/40 border-[#232732] opacity-75 hover:opacity-100 hover:border-slate-500'
                              : 'bg-[#181b22] hover:bg-[#1f242e] border-[#2b313e] hover:border-sky-500/60'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border flex-shrink-0',
                                methodStyle.badge
                              )}
                            >
                              {req.method || 'GET'}
                            </span>

                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-200 truncate">
                                {req.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 truncate">
                                {req.url || 'No URL'}
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0 ml-2">
                            {isOnCanvas ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 text-[10px] font-mono">
                                <Check size={10} />
                                <span>On Canvas</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/50 hover:bg-sky-900 text-sky-400 border border-sky-800/50 text-[10px] font-mono">
                                <Plus size={10} />
                                <span>Add</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-[#232732] bg-[#111318] flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{allRequests.length} total workspace requests</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#181b22] hover:bg-[#232732] text-slate-300 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
