import { useMemo, useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Variable,
  AlertTriangle,
  ArrowRight,
  Square,
  CheckSquare,
  FileText,
} from 'lucide-react';
import VariableInput from './VariableInput';
import VariablePicker from '../../environments/components/VariablePicker';
import VariableSuggestionsDropdown from './VariableSuggestionsDropdown';
import { useInlineVariableAutocomplete } from '../hooks/useInlineVariableAutocomplete';
import { findDuplicateKeys } from '../utils/urlUtils';
import {
  validateJson,
  formatJson,
  calculatePayloadMetrics,
  convertUrlEncodedToFormData,
  convertFormDataToUrlEncoded,
} from '../utils/bodyUtils';
import { cn } from '../../../utils/cn';

const BODY_MODES = [
  { id: 'none', label: 'None' },
  { id: 'json', label: 'JSON' },
  { id: 'text', label: 'Text' },
  { id: 'x-www-form-urlencoded', label: 'Form URL-encoded' },
  { id: 'form-data', label: 'Form Data' },
  { id: 'raw', label: 'Raw' },
];

const RAW_SUB_TYPES = ['Text', 'JSON', 'XML', 'HTML', 'JavaScript'];

export default function BodyEditor({
  body = { mode: 'none', raw: '', urlencoded: [], formData: [] },
  headers = [],
  onModeChange,
  onRawChange,
  onClearRaw,
  onUpdateUrlEncoded,
  onAddUrlEncoded,
  onDuplicateUrlEncoded,
  onRemoveUrlEncoded,
  onEnableAllUrlEncoded,
  onClearUrlEncoded,
  onUpdateFormData,
  onAddFormData,
  onDuplicateFormData,
  onRemoveFormData,
  onEnableAllFormData,
  onClearFormData,
  onSetHeaderKeyValue,
  variables = [],
  activeEnvName,
  className,
}) {
  const [jsonFormatError, setJsonFormatError] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [rawSubType, setRawSubType] = useState('Text');
  const textareaRef = useRef(null);

  const mode = body.mode || 'none';

  // Autocomplete hook for raw textarea
  const {
    showSuggestions,
    suggestions,
    selectedIndex,
    handleInputChange,
    handleKeyDown: handleAutocompleteKeyDown,
    handleSelect,
    closeSuggestions,
  } = useInlineVariableAutocomplete({
    value: body.raw || '',
    onChange: onRawChange,
    variables,
  });

  // Handle Tab key inside textarea for 2-space indentation
  const handleTextareaKeyDown = (e) => {
    const handled = handleAutocompleteKeyDown(e);
    if (handled) return;

    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = body.raw || '';

      const updated = current.substring(0, start) + '  ' + current.substring(end);
      onRawChange?.(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Check Content-Type header alignment without overwriting custom headers
  const contentTypeStatus = useMemo(() => {
    const ctHeader = (headers || []).find(
      (h) => (h.key || '').trim().toLowerCase() === 'content-type' && h.enabled !== false
    );
    const ctValue = (ctHeader?.value || '').trim().toLowerCase();

    if (mode === 'json') {
      if (!ctHeader) {
        return {
          mismatch: true,
          expected: 'application/json',
          message: 'Content-Type header is missing. JSON requests typically use application/json.',
        };
      }
      if (!ctValue.includes('json')) {
        return {
          mismatch: true,
          expected: 'application/json',
          message: `Content-Type is set to "${ctHeader.value}", but body mode is JSON.`,
        };
      }
    } else if (mode === 'x-www-form-urlencoded') {
      if (!ctHeader) {
        return {
          mismatch: true,
          expected: 'application/x-www-form-urlencoded',
          message: 'Content-Type header is missing. Form requests use application/x-www-form-urlencoded.',
        };
      }
      if (!ctValue.includes('urlencoded')) {
        return {
          mismatch: true,
          expected: 'application/x-www-form-urlencoded',
          message: `Content-Type is set to "${ctHeader.value}", but body mode is Form URL-encoded.`,
        };
      }
    } else if (mode === 'form-data') {
      if (ctHeader && !ctValue.includes('form-data') && !ctValue.includes('multipart')) {
        return {
          mismatch: true,
          expected: 'multipart/form-data',
          message: `Content-Type is set to "${ctHeader.value}", but body mode is Form Data.`,
        };
      }
    }

    return { mismatch: false };
  }, [mode, headers]);

  // Duplicate keys in URL-encoded form
  const duplicateUrlEncodedKeys = useMemo(() => {
    return findDuplicateKeys(body.urlencoded, false);
  }, [body.urlencoded]);

  // Duplicate keys in Form-Data
  const duplicateFormDataKeys = useMemo(() => {
    return findDuplicateKeys(body.formData, false);
  }, [body.formData]);

  // Handle switching mode with non-destructive data conversion and optional header sync
  const handleModeSelect = (newMode) => {
    if (newMode === mode) return;

    // Non-destructive row porting between urlencoded and formData
    if (newMode === 'form-data' && mode === 'x-www-form-urlencoded') {
      const hasPopulatedUrlEncoded = (body.urlencoded || []).some((u) => u.key?.trim() || u.value?.trim());
      const hasPopulatedFormData = (body.formData || []).some((f) => f.key?.trim() || f.value?.trim());
      if (hasPopulatedUrlEncoded && !hasPopulatedFormData && onUpdateFormData) {
        const ported = convertUrlEncodedToFormData(body.urlencoded);
        ported.forEach((item, idx) => {
          onUpdateFormData(idx, 'key', item.key);
          onUpdateFormData(idx, 'value', item.value);
          onUpdateFormData(idx, 'enabled', item.enabled);
        });
      }
    } else if (newMode === 'x-www-form-urlencoded' && mode === 'form-data') {
      const hasPopulatedFormData = (body.formData || []).some((f) => f.key?.trim() || f.value?.trim());
      const hasPopulatedUrlEncoded = (body.urlencoded || []).some((u) => u.key?.trim() || u.value?.trim());
      if (hasPopulatedFormData && !hasPopulatedUrlEncoded && onUpdateUrlEncoded) {
        const ported = convertFormDataToUrlEncoded(body.formData);
        ported.forEach((item, idx) => {
          onUpdateUrlEncoded(idx, 'key', item.key);
          onUpdateUrlEncoded(idx, 'value', item.value);
          onUpdateUrlEncoded(idx, 'enabled', item.enabled);
        });
      }
    }

    onModeChange?.(newMode);

    // If switching to standard modes, auto-set Content-Type only if NO Content-Type header exists at all
    const hasContentType = (headers || []).some(
      (h) => (h.key || '').trim().toLowerCase() === 'content-type' && (h.value || '').trim()
    );

    if (!hasContentType && onSetHeaderKeyValue) {
      if (newMode === 'json') {
        onSetHeaderKeyValue('Content-Type', 'application/json');
      } else if (newMode === 'x-www-form-urlencoded') {
        onSetHeaderKeyValue('Content-Type', 'application/x-www-form-urlencoded');
      } else if (newMode === 'form-data') {
        onSetHeaderKeyValue('Content-Type', 'multipart/form-data');
      } else if (newMode === 'text') {
        onSetHeaderKeyValue('Content-Type', 'text/plain');
      }
    }
  };

  // Validate JSON if in JSON mode (supporting {{template}} variables and reporting line/column)
  const jsonValidation = useMemo(() => {
    if (mode !== 'json' || !body.raw || !body.raw.trim()) {
      return null;
    }
    return validateJson(body.raw);
  }, [mode, body.raw]);

  // Calculate payload metrics
  const payloadMetrics = useMemo(() => {
    if (mode === 'json' || mode === 'text' || mode === 'raw') {
      return calculatePayloadMetrics(body.raw, mode);
    }
    if (mode === 'x-www-form-urlencoded') {
      return calculatePayloadMetrics(body.urlencoded, mode);
    }
    if (mode === 'form-data') {
      return calculatePayloadMetrics(body.formData, mode);
    }
    return { lines: 0, sizeBytes: 0, formattedSize: '0 B' };
  }, [mode, body.raw, body.urlencoded, body.formData]);

  // Line numbers generation for code editor
  const lineCount = useMemo(() => {
    if (!body.raw) return 1;
    return Math.max(1, body.raw.split('\n').length);
  }, [body.raw]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  const handlePrettify = () => {
    if (!body.raw) return;
    try {
      const formatted = formatJson(body.raw);
      onRawChange(formatted);
      setJsonFormatError(null);
    } catch (err) {
      setJsonFormatError(err.message || 'Cannot format: body contains invalid JSON');
      setTimeout(() => setJsonFormatError(null), 3500);
    }
  };

  const handleCopyBody = () => {
    let contentToCopy = '';
    if (mode === 'json' || mode === 'text' || mode === 'raw') {
      contentToCopy = body.raw || '';
    } else if (mode === 'x-www-form-urlencoded') {
      contentToCopy = (body.urlencoded || [])
        .filter((u) => u.enabled !== false && (u.key?.trim() || u.value?.trim()))
        .map((u) => `${u.key}=${u.value}`)
        .join('&');
    } else if (mode === 'form-data') {
      contentToCopy = (body.formData || [])
        .filter((f) => f.enabled !== false && (f.key?.trim() || f.value?.trim()))
        .map((f) => `${f.key} (${f.type || 'text'}): ${f.value}`)
        .join('\n');
    }

    if (contentToCopy) {
      navigator.clipboard.writeText(contentToCopy);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  const handleClearBody = () => {
    if (mode === 'json' || mode === 'text' || mode === 'raw') {
      if (onClearRaw) onClearRaw();
      else onRawChange?.('');
    } else if (mode === 'x-www-form-urlencoded') {
      onClearUrlEncoded?.();
    } else if (mode === 'form-data') {
      onClearFormData?.();
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

  const allUrlEncodedEnabled =
    (body.urlencoded || []).length > 0 && (body.urlencoded || []).every((u) => u.enabled !== false);

  const allFormDataEnabled =
    (body.formData || []).length > 0 && (body.formData || []).every((f) => f.enabled !== false);

  return (
    <div className={cn('p-4 space-y-3', className)}>
      {/* Top Toolbar: Body Type Selector + Contextual Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-[#14171f] p-0.5 rounded-md border border-[#2b313e]">
          {BODY_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeSelect(m.id)}
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

        {/* Contextual Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Payload Metrics Badge */}
          {mode !== 'none' && payloadMetrics.lines > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#161a24] border border-[#252d3d] text-slate-400">
              {payloadMetrics.lines} {payloadMetrics.lines === 1 ? 'line' : 'lines'} • {payloadMetrics.formattedSize}
            </span>
          )}

          {/* Raw Sub-type Selector */}
          {mode === 'raw' && (
            <select
              value={rawSubType}
              onChange={(e) => setRawSubType(e.target.value)}
              className="bg-[#181b22] border border-[#2b313e] rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {RAW_SUB_TYPES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          )}

          {/* JSON Validation Status */}
          {mode === 'json' && jsonValidation && (
            <div className="flex items-center gap-1 text-[11px] font-mono">
              {jsonValidation.valid ? (
                <span
                  className="text-emerald-400 flex items-center gap-1"
                  title={jsonValidation.templated ? 'Valid JSON with template variables' : 'Valid JSON'}
                >
                  <CheckCircle2 size={12} />
                  <span>{jsonValidation.templated ? 'Valid JSON (Templated)' : 'Valid JSON'}</span>
                </span>
              ) : (
                <span
                  className="text-amber-400 flex items-center gap-1"
                  title={jsonValidation.error || 'Invalid JSON syntax'}
                >
                  <AlertCircle size={12} />
                  <span>
                    Invalid JSON (L{jsonValidation.line || 1}:C{jsonValidation.column || 1})
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Format JSON Button */}
          {mode === 'json' && (
            <button
              type="button"
              onClick={handlePrettify}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Prettify and format JSON"
            >
              <Wand2 size={12} className="text-sky-400" />
              <span>Format</span>
            </button>
          )}

          {/* Copy Body Content */}
          {mode !== 'none' && (
            <button
              type="button"
              onClick={handleCopyBody}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copy body payload"
            >
              {copiedBody ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedBody ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {/* Insert Variable Button for Text/Raw/JSON */}
          {(mode === 'json' || mode === 'text' || mode === 'raw') && (
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Insert variable from environment or runner..."
            >
              <Variable size={12} className="text-sky-400" />
              <span>Insert Variable</span>
            </button>
          )}

          {/* Clear Body Content */}
          {mode !== 'none' && (
            <button
              type="button"
              onClick={handleClearBody}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Clear request body"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          )}

          {/* Form Actions */}
          {mode === 'x-www-form-urlencoded' && (
            <>
              <button
                type="button"
                onClick={() => onEnableAllUrlEncoded?.(!allUrlEncodedEnabled)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {allUrlEncodedEnabled ? <Square size={12} /> : <CheckSquare size={12} />}
                <span>{allUrlEncodedEnabled ? 'Disable All' : 'Enable All'}</span>
              </button>

              <button
                type="button"
                onClick={onAddUrlEncoded}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-xs text-sky-300 hover:text-sky-200 font-medium transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Field</span>
              </button>
            </>
          )}

          {mode === 'form-data' && (
            <>
              <button
                type="button"
                onClick={() => onEnableAllFormData?.(!allFormDataEnabled)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {allFormDataEnabled ? <Square size={12} /> : <CheckSquare size={12} />}
                <span>{allFormDataEnabled ? 'Disable All' : 'Enable All'}</span>
              </button>

              <button
                type="button"
                onClick={onAddFormData}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-xs text-sky-300 hover:text-sky-200 font-medium transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Field</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content-Type Warning / Suggestion Banner */}
      {contentTypeStatus.mismatch && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-950/40 border border-amber-800/50 rounded-md text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span>{contentTypeStatus.message}</span>
          </div>
          {onSetHeaderKeyValue && (
            <button
              type="button"
              onClick={() => onSetHeaderKeyValue('Content-Type', contentTypeStatus.expected)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-900/60 hover:bg-amber-800/80 border border-amber-700/60 text-[11px] font-mono text-amber-200 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <span>Set Header</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>
      )}

      {jsonFormatError && (
        <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2.5 py-1 rounded">
          {jsonFormatError}
        </div>
      )}

      {/* 1. Mode None Empty State */}
      {mode === 'none' && (
        <div className="py-12 text-center text-slate-500 border border-dashed border-[#232732] rounded-md bg-[#111318]/50">
          <FileText size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
          <p className="text-xs">This request has no body.</p>
          <p className="text-[11px] text-slate-600 mt-0.5">Select a body mode above to configure a request payload.</p>
        </div>
      )}

      {/* 2. Code Editor for JSON, Text, Raw with Line Number Gutter */}
      {(mode === 'json' || mode === 'text' || mode === 'raw') && (
        <div className="relative border border-[#232732] rounded-md overflow-hidden bg-[#0c0d12] flex">
          {/* Synchronized Line Numbers Gutter */}
          <div className="py-3 px-2 bg-[#090a0e] border-r border-[#1e2330] select-none text-right font-mono text-[11px] text-slate-600 min-w-[36px] leading-relaxed">
            {lineNumbers.map((num) => (
              <div key={num}>{num}</div>
            ))}
          </div>

          {/* Textarea Area */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={body.raw || ''}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
              placeholder={
                mode === 'json'
                  ? '{\n  "key": "value",\n  "userId": "{{userId}}"\n}'
                  : 'Enter request body content or {{variables}}...'
              }
              spellCheck={false}
              rows={12}
              className="w-full p-3 bg-transparent text-slate-100 placeholder-slate-600 font-mono text-xs leading-relaxed focus:outline-none resize-y min-h-[180px]"
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
        </div>
      )}

      {/* 3. Form URL-Encoded Table */}
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
                    <th className="w-10 px-3 py-2 text-center" title="Enable/disable field">
                      <input
                        type="checkbox"
                        checked={allUrlEncodedEnabled}
                        onChange={(e) => onEnableAllUrlEncoded?.(e.target.checked)}
                        className="rounded border-[#2b313e] bg-[#1c212c] text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        title={allUrlEncodedEnabled ? 'Disable all' : 'Enable all'}
                      />
                    </th>
                    <th className="w-1/3 px-3 py-2">KEY</th>
                    <th className="w-1/3 px-3 py-2">VALUE</th>
                    <th className="px-3 py-2">DESCRIPTION</th>
                    <th className="w-16 px-3 py-2 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2330]">
                  {(body.urlencoded || []).map((item, index) => {
                    const isDup = item.enabled !== false && item.key && duplicateUrlEncodedKeys.has(item.key);
                    return (
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
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={item.key || ''}
                              onChange={(e) => onUpdateUrlEncoded(index, 'key', e.target.value)}
                              placeholder="Key"
                              className={cn(
                                'w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none pr-5',
                                isDup && 'text-amber-300'
                              )}
                            />
                            {isDup && (
                              <span
                                className="absolute right-0 text-amber-400 select-none"
                                title={`Duplicate form key "${item.key}"`}
                              >
                                <AlertTriangle size={12} />
                              </span>
                            )}
                          </div>
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
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onDuplicateUrlEncoded?.(index)}
                              title="Duplicate row"
                              className="text-slate-500 hover:text-sky-300 p-1 rounded hover:bg-[#202531] transition-colors cursor-pointer"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveUrlEncoded(index)}
                              title="Remove field"
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
        </>
      )}

      {/* 4. Multipart / Form Data Table */}
      {mode === 'form-data' && (
        <>
          {(!body.formData || body.formData.length === 0) ? (
            <div className="py-10 text-center text-slate-500 border border-dashed border-[#232732] rounded-md bg-[#111318]/50">
              <p className="text-xs mb-2">No multipart form-data fields configured.</p>
              <button
                type="button"
                onClick={onAddFormData}
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
                    <th className="w-10 px-3 py-2 text-center" title="Enable/disable field">
                      <input
                        type="checkbox"
                        checked={allFormDataEnabled}
                        onChange={(e) => onEnableAllFormData?.(e.target.checked)}
                        className="rounded border-[#2b313e] bg-[#1c212c] text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        title={allFormDataEnabled ? 'Disable all' : 'Enable all'}
                      />
                    </th>
                    <th className="w-1/4 px-3 py-2">KEY</th>
                    <th className="w-20 px-2 py-2">TYPE</th>
                    <th className="w-1/3 px-3 py-2">VALUE</th>
                    <th className="px-3 py-2">DESCRIPTION</th>
                    <th className="w-16 px-3 py-2 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2330]">
                  {(body.formData || []).map((item, index) => {
                    const isDup = item.enabled !== false && item.key && duplicateFormDataKeys.has(item.key);
                    const isFile = item.type === 'file';

                    return (
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
                            onChange={(e) => onUpdateFormData(index, 'enabled', e.target.checked)}
                            className="rounded border-[#2b313e] bg-[#1c212c] text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={item.key || ''}
                              onChange={(e) => onUpdateFormData(index, 'key', e.target.value)}
                              placeholder="Key"
                              className={cn(
                                'w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none pr-5',
                                isDup && 'text-amber-300'
                              )}
                            />
                            {isDup && (
                              <span
                                className="absolute right-0 text-amber-400 select-none"
                                title={`Duplicate form-data key "${item.key}"`}
                              >
                                <AlertTriangle size={12} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={item.type || 'text'}
                            onChange={(e) => onUpdateFormData(index, 'type', e.target.value)}
                            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-1.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                          >
                            <option value="text">Text</option>
                            <option value="file">File</option>
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          {isFile ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={item.value || ''}
                                onChange={(e) => onUpdateFormData(index, 'value', e.target.value)}
                                placeholder="File path/reference (e.g. ./sample.pdf)"
                                className="w-full bg-transparent font-mono text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                                title="File reference. File uploads are reference-only and not streamed via templates."
                              />
                            </div>
                          ) : (
                            <VariableInput
                              value={item.value || ''}
                              onChange={(val) => onUpdateFormData(index, 'value', val)}
                              placeholder="Value (e.g. {{avatarUrl}})"
                              variables={variables}
                              activeEnvName={activeEnvName}
                              pickerButtonTitle="Insert variable into form value..."
                            />
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => onUpdateFormData(index, 'description', e.target.value)}
                            placeholder="Description"
                            className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onDuplicateFormData?.(index)}
                              title="Duplicate row"
                              className="text-slate-500 hover:text-sky-300 p-1 rounded hover:bg-[#202531] transition-colors cursor-pointer"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveFormData(index)}
                              title="Remove field"
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
