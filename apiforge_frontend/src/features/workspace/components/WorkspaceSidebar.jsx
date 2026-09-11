import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Layers,
  Loader2,
} from 'lucide-react';
import EnvironmentSwitcher from '../../environments/components/EnvironmentSwitcher';
import { useCollectionsQuery } from '../hooks/useWorkspace';
import { listRequests, createRequest } from '../../requests/services/requestApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '../../../utils/cn';

const METHOD_COLORS = {
  GET: 'text-emerald-400',
  POST: 'text-amber-400',
  PUT: 'text-blue-400',
  PATCH: 'text-purple-400',
  DELETE: 'text-rose-400',
  HEAD: 'text-teal-400',
  OPTIONS: 'text-indigo-400',
};

function CollectionItem({ workspaceId, collection, activeRequestId }) {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', workspaceId, collection.id],
    queryFn: () => listRequests(workspaceId, collection.id),
    enabled: Boolean(workspaceId && collection.id),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createRequest(workspaceId, collection.id, {
        name: 'New Request',
        method: 'GET',
        url: 'https://httpbin.org/get',
      }),
    onSuccess: (newReq) => {
      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId, collection.id] });
      navigate(`/workspace/${workspaceId}/collections/${collection.id}/requests/${newReq.id}`);
    },
  });

  return (
    <div className="text-xs select-none">
      {/* Collection Header */}
      <div className="group flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#181b22] text-slate-300 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 flex-1 text-left truncate font-medium"
        >
          {isOpen ? (
            <ChevronDown size={13} className="text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronRight size={13} className="text-slate-500 flex-shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen size={14} className="text-sky-400 flex-shrink-0" />
          ) : (
            <Folder size={14} className="text-sky-400 flex-shrink-0" />
          )}
          <span className="truncate">{collection.name}</span>
        </button>

        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          title="Add request to collection"
          className="text-slate-500 hover:text-sky-400 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {createMutation.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Plus size={12} />
          )}
        </button>
      </div>

      {/* Requests List */}
      {isOpen && (
        <div className="pl-5 space-y-0.5 mt-0.5 border-l border-[#232732] ml-3">
          {isLoading && (
            <div className="py-1 px-2 text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
              <Loader2 size={10} className="animate-spin" />
              <span>Loading requests...</span>
            </div>
          )}

          {!isLoading && requests.length === 0 && (
            <div className="py-1 px-2 text-[11px] text-slate-600 italic">
              No requests yet
            </div>
          )}

          {!isLoading &&
            requests.map((req) => {
              const isActive = activeRequestId === req.id;
              const methodColor = METHOD_COLORS[req.method] || 'text-slate-400';

              return (
                <Link
                  key={req.id}
                  to={`/workspace/${workspaceId}/collections/${collection.id}/requests/${req.id}`}
                  className={cn(
                    'flex items-center gap-2 py-1 px-2 rounded transition-colors truncate',
                    isActive
                      ? 'bg-sky-500/10 text-sky-300 font-medium border-l-2 border-sky-500 -ml-[1px]'
                      : 'text-slate-400 hover:bg-[#181b22] hover:text-slate-200'
                  )}
                >
                  <span className={cn('font-mono font-bold text-[10px] w-8 flex-shrink-0', methodColor)}>
                    {req.method}
                  </span>
                  <span className="truncate text-xs">{req.name}</span>
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default function WorkspaceSidebar({ workspaceId, className }) {
  const { requestId } = useParams();
  const { data: collections = [], isLoading } = useCollectionsQuery(workspaceId);

  return (
    <aside
      className={cn(
        'w-64 h-full bg-[#111318] border-r border-[#232732] flex flex-col flex-shrink-0 select-none overflow-hidden',
        className
      )}
    >
      {/* Top Workspace & Environment Switcher Header */}
      <div className="p-3 border-b border-[#232732] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Layers size={14} className="text-sky-400" />
            <span>Workspace Collections</span>
          </div>
        </div>

        {workspaceId && <EnvironmentSwitcher workspaceId={workspaceId} className="w-full" />}
      </div>

      {/* Collections & Requests Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <Loader2 size={16} className="animate-spin text-sky-500" />
            <span>Loading collections...</span>
          </div>
        ) : collections.length === 0 ? (
          <div className="py-8 px-4 text-center text-slate-500 text-xs">
            <p className="mb-2">No collections in this workspace.</p>
          </div>
        ) : (
          collections.map((c) => (
            <CollectionItem
              key={c.id}
              workspaceId={workspaceId}
              collection={c}
              activeRequestId={requestId}
            />
          ))
        )}
      </div>
    </aside>
  );
}

