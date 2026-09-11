import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function ParamsEditor({
  queryParams = [],
  onUpdateParam,
  onAddParam,
  onRemoveParam,
  className,
}) {
  return (
    <div className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Query Parameters
        </h3>
        <button
          type="button"
          onClick={onAddParam}
          className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
        >
          <Plus size={13} />
          <span>Add Parameter</span>
        </button>
      </div>

      <div className="border border-[#232732] rounded-md overflow-hidden bg-[#111318]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#232732] bg-[#14171f] text-[11px] font-semibold text-slate-400">
              <th className="w-10 px-3 py-2 text-center"></th>
              <th className="w-1/3 px-3 py-2">KEY</th>
              <th className="w-1/3 px-3 py-2">VALUE</th>
              <th className="px-3 py-2">DESCRIPTION</th>
              <th className="w-10 px-3 py-2 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2330]">
            {queryParams.map((param, index) => (
              <tr
                key={index}
                className={cn(
                  'group hover:bg-[#181b22]/70 transition-colors',
                  !param.enabled && 'opacity-50'
                )}
              >
                <td className="px-3 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={param.enabled !== false}
                    onChange={(e) => onUpdateParam(index, 'enabled', e.target.checked)}
                    className="rounded border-[#2b313e] bg-[#1c212c] text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={param.key || ''}
                    onChange={(e) => onUpdateParam(index, 'key', e.target.value)}
                    placeholder="Key"
                    className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={param.value || ''}
                    onChange={(e) => onUpdateParam(index, 'value', e.target.value)}
                    placeholder="Value (e.g. {{userId}})"
                    className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={param.description || ''}
                    onChange={(e) => onUpdateParam(index, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveParam(index)}
                    title="Remove parameter"
                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

