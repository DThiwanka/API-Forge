import { useMemo, useRef } from 'react';
import { Plus, Trash2, Copy, AlertTriangle, CheckSquare, Square, RotateCcw } from 'lucide-react';
import VariableInput from './VariableInput';
import { findDuplicateKeys } from '../utils/urlUtils';
import { cn } from '../../../utils/cn';

export default function ParamsEditor({
  queryParams = [],
  onUpdateParam,
  onAddParam,
  onRemoveParam,
  onDuplicateParam,
  onEnableAll,
  onClearAll,
  variables = [],
  activeEnvName,
  className,
}) {
  const tableRef = useRef(null);

  // Duplicate key detection among enabled parameters
  const duplicateKeys = useMemo(() => {
    return findDuplicateKeys(queryParams, false);
  }, [queryParams]);

  const activeCount = useMemo(() => {
    return queryParams.filter((p) => p.enabled !== false && (p.key?.trim() || p.value?.trim())).length;
  }, [queryParams]);

  const allEnabled = queryParams.length > 0 && queryParams.every((p) => p.enabled !== false);

  const handleKeyDown = (e, rowIndex, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If pressing Enter on the last row's description or value, add a new row
      if (rowIndex === queryParams.length - 1) {
        onAddParam?.();
      } else if (tableRef.current) {
        // Focus the next row's same field or key
        const inputs = tableRef.current.querySelectorAll(`input[data-field="${fieldName}"]`);
        if (inputs && inputs[rowIndex + 1]) {
          inputs[rowIndex + 1].focus();
        }
      }
    }
  };

  return (
    <div className={cn('p-4 space-y-3', className)}>
      {/* Top Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Query Parameters
          </h3>
          <span className="text-[11px] px-1.5 py-0.2 rounded font-mono bg-[#181b22] text-slate-400 border border-[#2b313e]">
            {activeCount} active
          </span>

          {duplicateKeys.size > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/60 text-amber-300 font-medium"
              title="Duplicate parameter keys detected. Multiple parameters with the same key will be serialized."
            >
              <AlertTriangle size={12} className="text-amber-400" />
              <span>Duplicate key: {Array.from(duplicateKeys).join(', ')}</span>
            </span>
          )}
        </div>

        {/* Bulk and Add Actions */}
        <div className="flex items-center gap-1.5">
          {queryParams.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onEnableAll?.(!allEnabled)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={allEnabled ? 'Disable all query parameters' : 'Enable all query parameters'}
              >
                {allEnabled ? <Square size={12} /> : <CheckSquare size={12} />}
                <span>{allEnabled ? 'Disable All' : 'Enable All'}</span>
              </button>

              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                title="Clear all query parameters"
              >
                <RotateCcw size={11} />
                <span>Clear All</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onAddParam}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-xs text-sky-300 hover:text-sky-200 font-medium transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Parameter</span>
          </button>
        </div>
      </div>

      {queryParams.length === 0 ? (
        <div className="py-10 text-center text-slate-500 border border-dashed border-[#232732] rounded-md bg-[#111318]/50">
          <p className="text-xs mb-2">No query parameters configured for this request.</p>
          <button
            type="button"
            onClick={onAddParam}
            className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Parameter</span>
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
                <th className="w-1/3 px-3 py-2">KEY</th>
                <th className="w-1/3 px-3 py-2">VALUE</th>
                <th className="px-3 py-2">DESCRIPTION</th>
                <th className="w-16 px-3 py-2 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2330]">
              {queryParams.map((param, index) => {
                const isDup = param.enabled !== false && param.key && duplicateKeys.has(param.key);
                return (
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
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          data-field="key"
                          value={param.key || ''}
                          onChange={(e) => onUpdateParam(index, 'key', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'key')}
                          placeholder="Key"
                          className={cn(
                            'w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none pr-5',
                            isDup && 'text-amber-300'
                          )}
                        />
                        {isDup && (
                          <span
                            className="absolute right-0 text-amber-400 select-none"
                            title={`Duplicate parameter key "${param.key}"`}
                          >
                            <AlertTriangle size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <VariableInput
                        value={param.value || ''}
                        onChange={(val) => onUpdateParam(index, 'value', val)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'value')}
                        placeholder="Value (e.g. {{userId}})"
                        className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                        variables={variables}
                        activeEnvName={activeEnvName}
                        pickerButtonTitle="Insert variable into parameter value..."
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        data-field="description"
                        value={param.description || ''}
                        onChange={(e) => onUpdateParam(index, 'description', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                        placeholder="Description (optional)"
                        className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onDuplicateParam?.(index)}
                          title="Duplicate row"
                          className="text-slate-500 hover:text-sky-300 p-1 rounded hover:bg-[#202531] transition-colors cursor-pointer"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveParam(index)}
                          title="Remove parameter"
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
