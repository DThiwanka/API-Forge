import { Plus, Trash2 } from 'lucide-react';
import VariableInput from './VariableInput';
import { cn } from '../../../utils/cn';

const COMMON_HEADERS = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Type',
  'Cookie',
  'User-Agent',
  'X-API-Key',
  'X-Request-ID',
];

export default function HeadersEditor({
  headers = [],
  onUpdateHeader,
  onAddHeader,
  onRemoveHeader,
  variables = [],
  activeEnvName,
  className,
}) {
  return (
    <div className={cn('p-4 space-y-3', className)}>
      <datalist id="common-headers-list">
        {COMMON_HEADERS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Request Headers
        </h3>
        <button
          type="button"
          onClick={onAddHeader}
          className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
          className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
        >
          <Plus size={13} />
          <span>Add Header</span>
        </button>
      </div>

      <div className="border border-[#232732] rounded-md overflow-hidden bg-[#111318]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#232732] bg-[#14171f] text-[11px] font-semibold text-slate-400">
              <th className="w-10 px-3 py-2 text-center"></th>
              <th className="w-1/3 px-3 py-2">HEADER</th>
              <th className="w-1/3 px-3 py-2">VALUE</th>
              <th className="px-3 py-2">DESCRIPTION</th>
              <th className="w-10 px-3 py-2 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2330]">
            {headers.map((header, index) => (
              <tr
                key={index}
                className={cn(
                  'group hover:bg-[#181b22]/70 transition-colors',
                  !header.enabled && 'opacity-50'
                )}
              >
                <td className="px-3 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={header.enabled !== false}
                    onChange={(e) => onUpdateHeader(index, 'enabled', e.target.checked)}
                    className="rounded border-[#2b313e] bg-[#1c212c] text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    list="common-headers-list"
                    value={header.key || ''}
                    onChange={(e) => onUpdateHeader(index, 'key', e.target.value)}
                    placeholder="Header (e.g. Content-Type)"
                    className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                  <VariableInput
                    value={header.value || ''}
                    onChange={(e) => onUpdateHeader(index, 'value', e.target.value)}
                    onChange={(val) => onUpdateHeader(index, 'value', val)}
                    placeholder="Value (e.g. {{token}})"
                    className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    variables={variables}
                    activeEnvName={activeEnvName}
                    pickerButtonTitle="Insert variable into header value..."
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={header.description || ''}
                    onChange={(e) => onUpdateHeader(index, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveHeader(index)}
                    title="Remove header"
                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
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

