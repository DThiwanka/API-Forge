import { ArrowRight, Folder, Layers } from 'lucide-react';

const METHOD_COLORS = {
  GET: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
  POST: 'bg-sky-950/60 text-sky-400 border-sky-800/60',
  PUT: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
  PATCH: 'bg-orange-950/60 text-orange-400 border-orange-800/60',
  DELETE: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
  HEAD: 'bg-purple-950/60 text-purple-400 border-purple-800/60',
  OPTIONS: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
};

export default function CommandItem({
  command,
  isSelected,
  onClick,
  onMouseEnter,
}) {
  const Icon = command.icon;
  const methodColor = command.method
    ? METHOD_COLORS[command.method] || 'bg-slate-800 text-slate-300 border-slate-700'
    : null;

  // Build breadcrumb string if available (e.g. "Collection / Folder")
  const breadcrumbs = [command.collectionName, command.folderName].filter(Boolean).join(' / ');

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      data-command-id={command.id}
      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors select-none text-xs ${
        isSelected
          ? 'bg-sky-950/60 text-white border border-sky-500/40 shadow-sm'
          : 'text-slate-300 hover:bg-[#181b22] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
        {/* Leading Method Badge or Category Icon */}
        {command.method ? (
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border shrink-0 ${methodColor}`}
          >
            {command.method}
          </span>
        ) : command.group === 'Folders' ? (
          <div
            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
              isSelected ? 'bg-sky-900/60 text-sky-300' : 'bg-[#181b22] text-amber-400/80 group-hover:text-amber-300'
            }`}
          >
            <Folder size={13} />
          </div>
        ) : command.group === 'Collections' ? (
          <div
            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
              isSelected ? 'bg-sky-900/60 text-sky-300' : 'bg-[#181b22] text-sky-400/80 group-hover:text-sky-300'
            }`}
          >
            <Layers size={13} />
          </div>
        ) : Icon ? (
          <div
            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
              isSelected ? 'bg-sky-900/60 text-sky-300' : 'bg-[#181b22] text-slate-400 group-hover:text-slate-200'
            }`}
          >
            <Icon size={12} />
          </div>
        ) : null}

        {/* Title & Description */}
        {/* Title, Path & Breadcrumb Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium truncate ${
                isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
              }`}
            >
              {command.title}
            </span>
          </div>
          {command.description && (
            <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
              {command.description}
            </p>
          )}

          {/* Subtitle / Path / Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate leading-tight mt-0.5">
            {command.path && (
              <span className="font-mono text-[10px] text-slate-400 truncate shrink-0 max-w-[220px]">
                {command.path}
              </span>
            )}
            {command.path && breadcrumbs && (
              <span className="text-slate-600 shrink-0">•</span>
            )}
            {breadcrumbs && (
              <span className="text-slate-500 truncate">
                {breadcrumbs}
              </span>
            )}
            {!command.path && !breadcrumbs && command.description && (
              <span className="truncate">{command.description}</span>
            )}
          </div>
        </div>
      </div>

      {/* Trailing Shortcut Badge or Enter Icon */}
      {/* Trailing Shortcut Badge or Select Indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        {command.shortcut && (
          <kbd
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
              isSelected
                ? 'bg-sky-900/50 text-sky-200 border-sky-600/50'
                : 'bg-[#14171f] text-slate-400 border-[#2b313e]'
            }`}
          >
            {command.shortcut}
          </kbd>
        )}
        {isSelected && (
          <div className="flex items-center gap-1 text-[10px] text-sky-300 font-mono">
            <span>Select</span>
            <ArrowRight size={10} />
          </div>
        )}
      </div>
    </div>
  );
}

