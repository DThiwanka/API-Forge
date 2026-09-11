import { useMemo, useState } from 'react';
import { Plus, Trash2, Wand2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';

const BODY_MODES = [
  { id: 'none', label: 'None' },
  { id: 'json', label: 'JSON' },
  { id: 'text', label: 'Text' },
  { id: 'x-www-form-urlencoded', label: 'Form URL-encoded' },
  { id: 'raw', label: 'Raw' },
];

export default function BodyEditor({
  body = { mode: 'none', raw: '', urlencoded: [] },
  onModeChange,
  onRawChange,
  onUpdateUrlEncoded,
  onAddUrlEncoded,
  onRemoveUrlEncoded,
  className,
}) {
  const [jsonFormatError, setJsonFormatError] = useState(null);

  const mode = body.mode || 'none';

  // Validate JSON if in JSON mode
  const jsonStatus = useMemo(() => {
    if (mode !== 'json' || !body.raw || !body.raw.trim()) {
      return null;
    }
    try {
      JSON.parse(body.raw);
      return { valid: true, error: null };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }, [mode, body.raw]);

  const handlePrettify = () => {
    if (!body.raw) return;
    try {
      const parsed = JSON.parse(body.raw);
      onRawChange(JSON.stringify(parsed, null, 2));
      setJsonFormatError(null);
    } catch {
      setJsonFormatError('Cannot prettify invalid JSON');
      setTimeout(() => setJsonFormatError(null), 3000);
    }
  };

  return (
    <div className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#14171f] p-0.5 rounded-md border border-[#2b313e]">
          {BODY_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                mode === m.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'json' && (
          <div className="flex items-center gap-2">
            {jsonStatus && (
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {jsonStatus.valid ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Valid JSON
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1" title={jsonStatus.error}>
                    <AlertCircle size={12} /> Invalid JSON
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handlePrettify}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-300 transition-colors"
              title="Prettify JSON"
            >
              <Wand2 size={12} className="text-sky-400" />
              <span>Format</span>
            </button>
          </div>
        )}

        {mode === 'x-www-form-urlencoded' && (
          <button
            type="button"
            onClick={onAddUrlEncoded}
            className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
          >
            <Plus size={13} />
            <span>Add Field</span>
          </button>
        )}
      </div>

      {jsonFormatError && (
        <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2.5 py-1 rounded">
          {jsonFormatError}
        </div>
      )}

      {mode === 'none' && (
        <div className="py-12 text-center text-slate-500 border border-dashed border-[#232732] rounded-md">
          <p className="text-xs">This request does not have a body.</p>
        </div>
      )}

      {(mode === 'json' || mode === 'text' || mode === 'raw') && (
        <div className="relative border border-[#232732] rounded-md overflow-hidden bg-[#0c0d12]">
          <textarea
            value={body.raw || ''}
            onChange={(e) => onRawChange(e.target.value)}
            placeholder={
              mode === 'json'
                ? '{\n  "key": "value"\n}'
                : 'Enter request body content or {{variables}}...'
            }
            spellCheck={false}
            rows={12}
            className="w-full p-3 bg-transparent text-slate-100 placeholder-slate-600 font-mono text-xs leading-relaxed focus:outline-none resize-y min-h-[160px]"
          />
        </div>
      )}

      {mode === 'x-www-form-urlencoded' && (
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
              {(body.urlencoded || []).map((item, index) => (
                <tr
                  key={index}
                  className={cn(
                    'group hover:bg-[#181b22]/70 transition-colors',
                    !item.enabled && 'opacity-50'
                  )}
                >
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={item.enabled !== false}
                      onChange={(e) => onUpdateUrlEncoded(index, 'enabled', e.target.checked)}
                      className="rounded border-[#2b313e] bg-[#1c212c] text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={item.key || ''}
                      onChange={(e) => onUpdateUrlEncoded(index, 'key', e.target.value)}
                      placeholder="Key"
                      className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => onUpdateUrlEncoded(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => onUpdateUrlEncoded(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveUrlEncoded(index)}
                      title="Remove field"
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
      )}
    </div>
  );
}

