import { useState, useMemo } from 'react';
import {
  Server,
  Key,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  CheckSquare,
  Square,
  Layers,
  FileCode2,
} from 'lucide-react';
import Badge from '../../../components/ui/Badge';

const METHOD_STYLES = {
  GET: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50',
  POST: 'bg-amber-950/60 text-amber-400 border-amber-800/50',
  PUT: 'bg-blue-950/60 text-blue-400 border-blue-800/50',
  PATCH: 'bg-purple-950/60 text-purple-400 border-purple-800/50',
  DELETE: 'bg-rose-950/60 text-rose-400 border-rose-800/50',
  HEAD: 'bg-slate-800 text-slate-300 border-slate-700',
  OPTIONS: 'bg-slate-800 text-slate-300 border-slate-700',
};

export default function OpenApiPreview({
  previewData,
  selectedKeys = new Set(),
  onToggleOperation,
  onToggleTag,
  onToggleAll,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedTags, setCollapsedTags] = useState(new Set());
  const [showWarnings, setShowWarnings] = useState(false);

  const {
    metadata = {},
    servers = [],
    variables = [],
    requests = [],
    warnings = [],
  } = previewData || {};

  // Group requests by tag/folderName
  const groupedRequests = useMemo(() => {
    const groups = new Map();

    requests.forEach((req, index) => {
      const tag = req.folderName || 'General (Untagged)';
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      // Attach index to uniquely identify requests
      groups.get(tag).push({ ...req, originalIndex: index });
    });

    return groups;
  }, [requests]);

  // Detected unique authentication schemes
  const detectedAuthTypes = useMemo(() => {
    const types = new Set();
    requests.forEach((r) => {
      if (r.auth && r.auth.type && r.auth.type !== 'none') {
        types.add(r.auth.type);
      }
    });
    return Array.from(types);
  }, [requests]);

  // Filter requests based on search term
  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groupedRequests;

    const filtered = new Map();
    groupedRequests.forEach((reqs, tag) => {
      const matching = reqs.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.url.toLowerCase().includes(term) ||
          r.method.toLowerCase().includes(term) ||
          tag.toLowerCase().includes(term)
      );
      if (matching.length > 0) {
        filtered.set(tag, matching);
      }
    });

    return filtered;
  }, [groupedRequests, searchTerm]);

  // Total filtered requests
  const totalFilteredCount = useMemo(() => {
    let count = 0;
    filteredGroups.forEach((reqs) => {
      count += reqs.length;
    });
    return count;
  }, [filteredGroups]);

  const toggleCollapse = (tag) => {
    setCollapsedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const isAllSelected = requests.length > 0 && selectedKeys.size === requests.length;

  return (
    <div className="space-y-4">
      {/* 1. Header & Specification Metadata Card */}
      <div className="p-3.5 rounded-lg bg-[#0d0f14] border border-[#2b313e] space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <FileCode2 size={16} className="text-sky-400 shrink-0" />
              <h3 className="text-sm font-semibold text-white">
                {metadata.title || 'OpenAPI Specification'}
              </h3>
              {metadata.version && (
                <Badge variant="default" className="text-[10px] font-mono py-0 px-1.5 bg-[#1f2430]">
                  v{metadata.version}
                </Badge>
              )}
              <Badge variant="info" className="text-[10px] font-mono py-0 px-1.5">
                {requests.length} operations
              </Badge>
            </div>
            {metadata.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {metadata.description}
              </p>
            )}
          </div>
        </div>

        {/* Servers & Variables info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1e2330] text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Server size={12} className="text-emerald-400 shrink-0" />
            <span className="text-slate-400">Server:</span>
            <span className="font-mono text-emerald-300 truncate" title={servers[0]?.url || 'No server defined'}>
              {servers[0]?.url || 'http://localhost'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Key size={12} className="text-amber-400 shrink-0" />
            <span className="text-slate-400">Auth detected:</span>
            <span className="text-slate-200">
              {detectedAuthTypes.length > 0 ? detectedAuthTypes.join(', ') : 'None'}
            </span>
          </div>
        </div>

        {/* Variable Suggestion */}
        {variables.length > 0 && variables[0]?.value && (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <span className="text-sky-400 font-mono font-medium">{'{{baseUrl}}'}</span>
            <span>maps to</span>
            <code className="text-slate-200 font-mono bg-[#181b22] px-1.5 py-0.5 rounded border border-[#2b313e]">
              {variables[0].value}
            </code>
          </div>
        )}
      </div>

      {/* 2. Warnings Alert (if any) */}
      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-800/40 bg-amber-950/20 text-xs">
          <button
            type="button"
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full px-3 py-2 flex items-center justify-between text-amber-300 hover:text-amber-200 text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <span className="font-medium">
                {warnings.length} warning{warnings.length > 1 ? 's' : ''} during specification parsing
              </span>
            </div>
            <span className="text-[11px] text-amber-400/80">
              {showWarnings ? 'Hide' : 'Show details'}
            </span>
          </button>
          {showWarnings && (
            <div className="px-3 pb-2.5 pt-1 border-t border-amber-800/30 space-y-1 text-slate-300 font-mono text-[11px] max-h-32 overflow-y-auto">
              {warnings.map((w, idx) => (
                <div key={idx} className="leading-snug">
                  • {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Operations Tree / Selection Area */}
      <div className="space-y-2">
        {/* Toolbar: Search & Select All */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name, path, method, or tag..."
              className="w-full bg-[#0d0f14] border border-[#2b313e] rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Select All / Deselect All */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            <button
              type="button"
              onClick={() => onToggleAll(!isAllSelected)}
              className="px-2.5 py-1.5 rounded bg-[#181b22] hover:bg-[#202530] border border-[#2b313e] text-slate-300 hover:text-white flex items-center gap-1.5 text-xs transition-colors"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare size={13} className="text-sky-400" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square size={13} className="text-slate-400" />
                  <span>Select All</span>
                </>
              )}
            </button>

            <span className="text-[11px] text-slate-400 font-mono">
              <span className={selectedKeys.size > 0 ? 'text-sky-400 font-semibold' : 'text-slate-500'}>
                {selectedKeys.size}
              </span>{' '}
              / {requests.length} selected
            </span>
          </div>
        </div>

        {/* Empty Search Result */}
        {totalFilteredCount === 0 && (
          <div className="text-center py-6 border border-dashed border-[#2b313e] rounded-lg text-slate-500 text-xs">
            No operations match &quot;{searchTerm}&quot;
          </div>
        )}

        {/* Grouped Tree List */}
        <div className="border border-[#2b313e] rounded-lg bg-[#0d0f14] divide-y divide-[#1e2330] max-h-64 overflow-y-auto">
          {Array.from(filteredGroups.entries()).map(([tag, reqs]) => {
            const isCollapsed = collapsedTags.has(tag);
            const tagKeys = reqs.map((r) => `${r.method}:${r.url}`);
            const tagSelectedCount = tagKeys.filter((k) => selectedKeys.has(k)).length;
            const isTagAllSelected = tagSelectedCount === reqs.length;
            const isTagPartial = tagSelectedCount > 0 && !isTagAllSelected;

            return (
              <div key={tag} className="group/tag">
                {/* Tag Header */}
                <div className="px-3 py-2 bg-[#12151c] flex items-center justify-between text-xs sticky top-0 z-10 border-b border-[#1c212d]">
                  <div className="flex items-center gap-2">
                    {/* Tag collapse trigger */}
                    <button
                      type="button"
                      onClick={() => toggleCollapse(tag)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Tag Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleTag(tag, !isTagAllSelected)}
                      className="text-slate-400 hover:text-white"
                    >
                      {isTagAllSelected ? (
                        <CheckSquare size={14} className="text-sky-400" />
                      ) : isTagPartial ? (
                        <div className="w-3.5 h-3.5 bg-sky-600/60 border border-sky-400 rounded flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-white" />
                        </div>
                      ) : (
                        <Square size={14} className="text-slate-500" />
                      )}
                    </button>

                    <Layers size={13} className="text-sky-400" />
                    <span className="font-semibold text-slate-200">{tag}</span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {tagSelectedCount} / {reqs.length}
                  </span>
                </div>

                {/* Operations List in Tag */}
                {!isCollapsed && (
                  <div className="divide-y divide-[#181c26]">
                    {reqs.map((req) => {
                      const key = `${req.method}:${req.url}`;
                      const isSelected = selectedKeys.has(key);
                      const methodColor =
                        METHOD_STYLES[req.method] || 'bg-slate-800 text-slate-300 border-slate-700';

                      return (
                        <div
                          key={key}
                          onClick={() => onToggleOperation(key)}
                          className={`px-3 py-1.5 flex items-center justify-between gap-3 text-xs hover:bg-[#151922] cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#141824]/40' : 'opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Checkbox */}
                            <span className="shrink-0 text-slate-400">
                              {isSelected ? (
                                <CheckSquare size={13} className="text-sky-400" />
                              ) : (
                                <Square size={13} className="text-slate-600" />
                              )}
                            </span>

                            {/* Method Badge */}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border shrink-0 ${methodColor}`}
                            >
                              {req.method}
                            </span>

                            {/* Request Name */}
                            <span className="text-slate-200 truncate font-medium text-xs">
                              {req.name}
                            </span>

                            {/* Path */}
                            <span className="text-slate-500 font-mono text-[11px] truncate hidden md:inline">
                              {req.url.replace(/^\{\{baseUrl\}\}/, '')}
                            </span>
                          </div>

                          {/* Auth indicator */}
                          {req.auth && req.auth.type && req.auth.type !== 'none' && (
                            <span className="text-[10px] font-mono text-slate-500 uppercase px-1 py-0.5 rounded bg-[#1c212d] shrink-0">
                              {req.auth.type}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

