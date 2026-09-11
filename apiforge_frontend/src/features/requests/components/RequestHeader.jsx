import { useState } from 'react';
import { Edit2, Check, Terminal } from 'lucide-react';
import RequestSaveButton from './RequestSaveButton';
import ExportDialog from '../../import-export/components/ExportDialog';
import { cn } from '../../../utils/cn';

export default function RequestHeader({
  name,
  onNameChange,
  isDirty,
  isSaving,
  onSave,
  workspaceId,
  requestId,
  className,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleStartEdit = () => {
    setTempName(name);
    setIsEditing(true);
  };

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed && trimmed !== name) {
      onNameChange(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setTempName(name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 bg-[#111318] border-b border-[#232732] select-none',
        className
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
        {isEditing ? (
          <div className="flex items-center gap-1.5 flex-1 max-w-md">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveName}
              autoFocus
              className="px-2 py-1 bg-[#181b22] text-slate-100 text-sm font-semibold rounded border border-sky-500 focus:outline-none w-full"
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="p-1 text-sky-400 hover:text-sky-300"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className="group flex items-center gap-2 cursor-pointer py-1 px-1.5 -ml-1.5 rounded hover:bg-[#181b22] transition-colors truncate"
            title="Click to rename request"
          >
            <h1 className="text-sm font-semibold text-slate-100 truncate">
              {name || 'Untitled Request'}
            </h1>
            <Edit2
              size={12}
              className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
            />
            {isDirty && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
                title="Unsaved changes"
              />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {requestId && (
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="Export request as cURL command"
          >
            <Terminal size={12} className="text-sky-400" />
            <span>Export</span>
          </button>
        )}

        <RequestSaveButton
          isSaving={isSaving}
          isDirty={isDirty}
          onSave={onSave}
        />
      </div>

      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        workspaceId={workspaceId}
        requestId={requestId}
        requestName={name}
      />
    </div>
  );
}

