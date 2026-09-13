import { useMemo, useRef } from 'react';
import { Plus, Trash2, Copy, AlertTriangle, CheckSquare, Square, RotateCcw, Sparkles } from 'lucide-react';
import VariableInput from './VariableInput';
import { findDuplicateKeys } from '../utils/urlUtils';
import { cn } from '../../../utils/cn';

const COMMON_HEADERS = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'Origin',
  'Pragma',
  'Referer',
  'User-Agent',
  'X-API-Key',
  'X-CSRF-Token',
  'X-Forwarded-For',
  'X-Request-ID',
];

const QUICK_HEADER_PRESETS = [
  { label: 'JSON Content-Type', key: 'Content-Type', value: 'application/json' },
  { label: 'JSON Accept', key: 'Accept', value: 'application/json' },
  { label: 'Bearer Auth', key: 'Authorization', value: 'Bearer {{token}}' },
];

export default function HeadersEditor({
  headers = [],
  onUpdateHeader,
  onAddHeader,
  onRemoveHeader,
  onDuplicateHeader,
  onEnableAll,
  onClearAll,
  onQuickAddHeader,
  variables = [],
  activeEnvName,
  className,
}) {
  const tableRef = useRef(null);

  // Duplicate key detection (case-insensitive for HTTP headers)
  const duplicateKeys = useMemo(() => {
    return findDuplicateKeys(headers, true);
  }, [headers]);

  const activeCount = useMemo(() => {
    return headers.filter((h) => h.enabled !== false && (h.key?.trim() || h.value?.trim())).length;
  }, [headers]);

  const allEnabled = headers.length > 0 && headers.every((h) => h.enabled !== false);

  const handleKeyDown = (e, rowIndex, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex === headers.length - 1) {
        onAddHeader?.();
      } else if (tableRef.current) {
        const inputs = tableRef.current.querySelectorAll(`input[data-field="${fieldName}"]`);
        if (inputs && inputs[rowIndex + 1]) {
          inputs[rowIndex + 1].focus();
        }
      }
    }
  };

  const handlePresetClick = (preset) => {
    if (onQuickAddHeader) {
      onQuickAddHeader(preset.key, preset.value);
    } else {
      // Fallback: update last empty row or add new
      const last = headers[headers.length - 1];
      if (last && !last.key?.trim() && !last.value?.trim()) {
        const idx = headers.length - 1;
        onUpdateHeader(idx, 'key', preset.key);
        onUpdateHeader(idx, 'value', preset.value);
      } else {
        onAddHeader?.();
        setTimeout(() => {
          onUpdateHeader(headers.length, 'key', preset.key);
          onUpdateHeader(headers.length, 'value', preset.value);
        }, 10);
      }
    }
  };

  return (
    <div className={cn('p-4 space-y-3', className)}>
      <datalist id="common-headers-list">
        {COMMON_HEADERS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>

      {/* Top Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Request Headers
          </h3>
          <span className="text-[11px] px-1.5 py-0.2 rounded font-mono bg-[#181b22] text-slate-400 border border-[#2b313e]">
            {activeCount} active
          </span>

          {duplicateKeys.size > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/60 text-amber-300 font-medium"
              title="Duplicate header keys detected. HTTP headers are case-insensitive and duplicates will overwrite or merge depending on server configuration."
            >
              <AlertTriangle size={12} className="text-amber-400" />
              <span>Duplicate header: {Array.from(duplicateKeys).join(', ')}</span>
            </span>
          )}
        </div>

        {/* Bulk and Add Actions */}
        <div className="flex items-center gap-1.5">
          {headers.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onEnableAll?.(!allEnabled)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={allEnabled ? 'Disable all headers' : 'Enable all headers'}
              >
                {allEnabled ? <Square size={12} /> : <CheckSquare size={12} />}
                <span>{allEnabled ? 'Disable All' : 'Enable All'}</span>
              </button>

              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                title="Clear all headers"
              >
                <RotateCcw size={11} />
                <span>Clear All</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onAddHeader}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-xs text-sky-300 hover:text-sky-200 font-medium transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Header</span>
          </button>
        </div>
      </div>

      {/* Quick Common Header Presets */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 overflow-x-auto pb-0.5">
        <span className="flex items-center gap-1 text-slate-500 shrink-0">
          <Sparkles size={11} className="text-sky-400" />
          <span>Quick Add:</span>
        </span>
        {QUICK_HEADER_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className="px-2 py-0.5 rounded bg-[#151923] hover:bg-[#1f2638] border border-[#273044] hover:border-sky-500/50 text-[11px] text-slate-300 hover:text-sky-200 transition-colors shrink-0 cursor-pointer"
          >
            + {preset.label}
          </button>
        ))}
      </div>

      {headers.length === 0 ? (
        <div className="py-10 text-center text-slate-500 border border-dashed border-[#232732] rounded-md bg-[#111318]/50">
          <p className="text-xs mb-2">No custom request headers configured.</p>
          <button
            type="button"
            onClick={onAddHeader}
            className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Header</span>
          </button>
        </div>
      ) : (
        <div ref={tableRef} className="border border-[#232732] rounded-md overflow-hidden bg-[#111318]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#232732] bg-[#14171f] text-[11px] font-semibold text-slate-400">
                <th className="w-10 px-3 py-2 text-center" title="Toggle enable/disable">
                  <input
                    type="checkbox"
                    checked={allEnabled}
                    onChange={(e) => onEnableAll?.(e.target.checked)}
                    className="rounded border-[#2b313e] bg-[#1c212c] text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    title={allEnabled ? 'Disable all' : 'Enable all'}
                  />
                </th>
                <th className="w-1/3 px-3 py-2">HEADER</th>
                <th className="w-1/3 px-3 py-2">VALUE</th>
                <th className="px-3 py-2">DESCRIPTION</th>
                <th className="w-16 px-3 py-2 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2330]">
              {headers.map((header, index) => {
                const normalizedKey = (header.key || '').trim().toLowerCase();
                const isDup = header.enabled !== false && normalizedKey && duplicateKeys.has(normalizedKey);

                return (
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
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          data-field="key"
                          list="common-headers-list"
                          value={header.key || ''}
                          onChange={(e) => onUpdateHeader(index, 'key', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'key')}
                          placeholder="Header (e.g. Content-Type)"
                          className={cn(
                            'w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none pr-5',
                            isDup && 'text-amber-300'
                          )}
                        />
                        {isDup && (
                          <span
                            className="absolute right-0 text-amber-400 select-none"
                            title={`Duplicate header key "${header.key}" (headers are case-insensitive)`}
                          >
                            <AlertTriangle size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <VariableInput
                        value={header.value || ''}
                        onChange={(val) => onUpdateHeader(index, 'value', val)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'value')}
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
                        data-field="description"
                        value={header.description || ''}
                        onChange={(e) => onUpdateHeader(index, 'description', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                        placeholder="Description (optional)"
                        className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onDuplicateHeader?.(index)}
                          title="Duplicate row"
                          className="text-slate-500 hover:text-sky-300 p-1 rounded hover:bg-[#202531] transition-colors cursor-pointer"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveHeader(index)}
                          title="Remove header"
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-[#202531] transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
