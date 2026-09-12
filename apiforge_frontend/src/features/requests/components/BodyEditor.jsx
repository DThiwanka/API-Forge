import { useMemo, useState, useRef } from 'react';
import { Plus, Trash2, Wand2, CheckCircle2, AlertCircle, Variable } from 'lucide-react';
import VariableInput from './VariableInput';
import VariablePicker from '../../environments/components/VariablePicker';
import VariableSuggestionsDropdown from './VariableSuggestionsDropdown';
import { useInlineVariableAutocomplete } from '../hooks/useInlineVariableAutocomplete';
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
  variables = [],
  activeEnvName,
  className,
}) {
  const [jsonFormatError, setJsonFormatError] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const textareaRef = useRef(null);

  const mode = body.mode || 'none';

  // Autocomplete hook for raw textarea
  const {
    showSuggestions,
    suggestions,
    selectedIndex,
    handleInputChange,
    handleKeyDown,
    handleSelect,
    closeSuggestions,
  } = useInlineVariableAutocomplete({
    value: body.raw || '',
    onChange: onRawChange,
    variables,
  });

  // Validate JSON if in JSON mode (supporting {{template}} variables)
  const jsonStatus = useMemo(() => {
    if (mode !== 'json' || !body.raw || !body.raw.trim()) {
      return null;
    }
    try {
      JSON.parse(body.raw);
      return { valid: true, templated: false, error: null };
    } catch (err) {
      // Test if template variables make it parseable
      try {
        const relaxed = body.raw.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '"__VAR__"');
        JSON.parse(relaxed);
        return { valid: true, templated: true, error: null };
      } catch {
        return { valid: false, templated: false, error: err.message };
      }
    }
  }, [mode, body.raw]);

  const handlePrettify = () => {
    if (!body.raw) return;
    try {
      const parsed = JSON.parse(body.raw);
      onRawChange(JSON.stringify(parsed, null, 2));
      setJsonFormatError(null);
    } catch {
      setJsonFormatError('Cannot prettify: body contains invalid JSON or unresolved syntax');
      setTimeout(() => setJsonFormatError(null), 3500);
    }
  };

  const handleInsertVariableFromPicker = (varKey) => {
    const textarea = textareaRef.current;
    const currentVal = body.raw || '';
    const start = textarea ? textarea.selectionStart : currentVal.length;
    const end = textarea ? textarea.selectionEnd : currentVal.length;

    const before = currentVal.slice(0, start);
    const after = currentVal.slice(end);
    const token = `{{${varKey}}}`;
    const nextVal = `${before}${token}${after}`;

    onRawChange?.(nextVal);

    if (textarea) {
      setTimeout(() => {
        textarea.focus();
        const newPos = start + token.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 10);
    }
  };

  return (
    <div className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-[#14171f] p-0.5 rounded-md border border-[#2b313e]">
          {BODY_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer',
                mode === m.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Toolbar actions for raw / json / text */}
        {(mode === 'json' || mode === 'text' || mode === 'raw') && (
          <div className="flex items-center gap-2">
            {mode === 'json' && jsonStatus && (
              <div className="flex items-center gap-1 text-[11px] font-mono mr-1">
                {jsonStatus.valid ? (
                  <span
                    className="text-emerald-400 flex items-center gap-1"
                    title={jsonStatus.templated ? 'Valid JSON with template variables' : 'Valid JSON'}
                  >
                    <CheckCircle2 size={12} /> {jsonStatus.templated ? 'Valid JSON (Templated)' : 'Valid JSON'}
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1" title={jsonStatus.error}>
                    <AlertCircle size={12} /> Invalid JSON
                  </span>
                )}
              </div>
            )}

            {mode === 'json' && (
              <button
                type="button"
                onClick={handlePrettify}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-300 transition-colors cursor-pointer"
                title="Prettify JSON"
              >
                <Wand2 size={12} className="text-sky-400" />
                <span>Format</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Insert variable from environment or runner..."
            >
              <Variable size={12} className="text-sky-400" />
              <span>Insert Variable</span>
            </button>
          </div>
        )}

        {mode === 'x-www-form-urlencoded' && (
          <button
            type="button"
            onClick={onAddUrlEncoded}
            className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
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
            ref={textareaRef}
            value={body.raw || ''}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'json'
                ? '{\n  "key": "value",\n  "userId": "{{userId}}"\n}'
                : 'Enter request body content or {{variables}}...'
            }
            spellCheck={false}
            rows={12}
            className="w-full p-3 bg-transparent text-slate-100 placeholder-slate-600 font-mono text-xs leading-relaxed focus:outline-none resize-y min-h-[160px]"
          />

          {/* Autocomplete dropdown inside textarea */}
          <div className="absolute left-4 top-12">
            <VariableSuggestionsDropdown
              isOpen={showSuggestions}
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
              onClose={closeSuggestions}
            />
          </div>
        </div>
      )}

      {mode === 'x-www-form-urlencoded' && (
        <>
          {(!body.urlencoded || body.urlencoded.length === 0) ? (
            <div className="py-10 text-center text-slate-500 border border-dashed border-[#232732] rounded-md bg-[#111318]/50">
              <p className="text-xs mb-2">No form URL-encoded fields configured.</p>
              <button
                type="button"
                onClick={onAddUrlEncoded}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Field</span>
              </button>
            </div>
          ) : (
            <div className="border border-[#232732] rounded-md overflow-hidden bg-[#111318]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#232732] bg-[#14171f] text-[11px] font-semibold text-slate-400">
                    <th className="w-10 px-3 py-2 text-center" title="Enable/disable field"></th>
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
                        <VariableInput
                          value={item.value || ''}
                          onChange={(val) => onUpdateUrlEncoded(index, 'value', val)}
                          placeholder="Value (e.g. {{token}})"
                          variables={variables}
                          activeEnvName={activeEnvName}
                          pickerButtonTitle="Insert variable into form value..."
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
          )}
        </>
      )}

      {/* Variable Picker Modal for Body */}
      <VariablePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleInsertVariableFromPicker}
        variables={variables}
        activeEnvName={activeEnvName}
        title="Insert Variable into Body"
      />
    </div>
  );
}
