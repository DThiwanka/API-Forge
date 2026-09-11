import { memo } from 'react';
import { Layers } from 'lucide-react';

function CollectionNodeComponent({ data, selected }) {
  const { name, description, requestCount = 0 } = data || {};

  return (
    <div
      className={`px-3 py-2 rounded-lg bg-[#111318]/90 border transition-all duration-150 select-none shadow-md ${
        selected
          ? 'border-sky-500 ring-1 ring-sky-500'
          : 'border-[#232732] hover:border-slate-500'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-sky-950/60 border border-sky-700/50 text-sky-400">
          <Layers size={13} />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-200">{name || 'Collection'}</div>
          {description && (
            <div className="text-[10px] text-slate-400 max-w-[180px] truncate">
              {description}
            </div>
          )}
        </div>
        <span className="ml-auto px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#181b22] text-slate-400 border border-[#232732]">
          {requestCount} reqs
        </span>
      </div>
    </div>
  );
}

export const CollectionNode = memo(CollectionNodeComponent);
export default CollectionNode;

