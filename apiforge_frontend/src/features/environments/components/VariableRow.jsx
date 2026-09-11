import { useState } from 'react';
import { Lock, Eye, EyeOff, Edit2, Trash2 } from 'lucide-react';

export default function VariableRow({
  variable,
  onEdit,
  onDelete,
  canManage = true,
}) {
  const [isRevealed, setIsRevealed] = useState(false);

  const isSecret = Boolean(variable.isSecret);

  // If secret and not revealed, display masked dots
  const displayValue = isSecret && !isRevealed ? '••••••••••••' : variable.value;

  return (
    <tr className="border-b border-[#232732]/70 hover:bg-[#14171f]/60 transition-colors text-xs select-text">
      {/* Variable Key */}
      <td className="px-4 py-2.5 font-mono text-sky-400 font-medium">
        <span className="bg-[#0f1117] px-1.5 py-0.5 rounded border border-[#232732]">
          {variable.key}
        </span>
      </td>

      {/* Variable Value */}
      <td className="px-4 py-2.5 font-mono text-slate-300">
        <div className="flex items-center gap-2 max-w-md">
          <span className="truncate" title={isSecret && !isRevealed ? 'Secret Value Masked' : variable.value}>
            {displayValue || <span className="text-slate-600 italic">Empty</span>}
          </span>

          {isSecret && (
            <button
              type="button"
              onClick={() => setIsRevealed(!isRevealed)}
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-[#1f242e] transition-colors"
              title={isRevealed ? 'Hide secret representation' : 'Reveal masked representation'}
            >
              {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          )}
        </div>
      </td>

      {/* Secret Badge */}
      <td className="px-4 py-2.5">
        {isSecret ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-amber-400 bg-amber-950/40 border border-amber-800/40">
            <Lock size={10} />
            <span>Secret</span>
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800/30 border border-slate-700/40">
            Standard
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-2.5 text-right select-none">
        {canManage && (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(variable)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1f242e] transition-colors"
              title="Edit variable"
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(variable)}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
              title="Delete variable"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
