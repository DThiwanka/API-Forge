import { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Variable,
  ArrowRight,
  Check,
  X,
  AlertCircle,
  Code2,
  FileText,
  Heading,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

const VARIABLE_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SOURCE_CONFIG = {
  json: {
    label: 'JSON Body',
    badge: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
    icon: Code2,
    placeholder: '$.access_token',
    helpText: 'Extracts value using safe JSONPath (e.g. $.token, $.user.id, $.items[0].id)',
  },
  header: {
    label: 'Response Header',
    badge: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
    icon: Heading,
    placeholder: 'X-Request-Id',
    helpText: 'Extracts header value case-insensitively (e.g. X-Request-Id, Location)',
  },
  text: {
    label: 'Plain Text',
    badge: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
    icon: FileText,
    placeholder: '',
    helpText: 'Extracts entire response body as raw text',
  },
};

export default function ExtractionEditor({
  rules = [],
  onChange,
  className,
}) {
  // Editing state: null (not editing) | { index: number | -1, rule: object }
  const [editingState, setEditingState] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const handleStartAdd = () => {
    setEditingState({
      index: -1,
      rule: {
        source: 'json',
        path: '',
        variable: '',
      },
    });
    setFormErrors({});
  };

  const handleStartEdit = (index) => {
    const target = rules[index];
    setEditingState({
      index,
      rule: {
        source: target.source || 'json',
        path: target.path || target.header || '',
        variable: target.variable || '',
      },
    });
    setFormErrors({});
  };

  const handleCancelEdit = () => {
    setEditingState(null);
    setFormErrors({});
  };

  const handleDeleteRule = (index) => {
    const next = rules.filter((_, i) => i !== index);
    onChange(next);
    if (editingState && editingState.index === index) {
      setEditingState(null);
    }
  };

  const validateRuleForm = (currentRule, editIndex) => {
    const errors = {};

    // 1. Variable name validation
    const varName = currentRule.variable ? currentRule.variable.trim() : '';
    if (!varName) {
      errors.variable = 'Variable name is required';
    } else if (!VARIABLE_REGEX.test(varName)) {
      errors.variable =
        'Variable name must start with a letter/underscore and contain only letters, numbers, and underscores';
    } else {
      // Check duplicate within existing rules (excluding current index if editing)
      const isDuplicate = rules.some(
        (r, idx) => idx !== editIndex && r.variable?.trim().toLowerCase() === varName.toLowerCase()
      );
      if (isDuplicate) {
        errors.variable = `Variable '${varName}' is already defined in this request`;
      }
    }

    // 2. Source-specific validation
    if (currentRule.source === 'json') {
      const path = currentRule.path ? currentRule.path.trim() : '';
      if (!path) {
        errors.path = 'JSON Path is required (e.g. $.token or user.id)';
      }
    } else if (currentRule.source === 'header') {
      const headerName = currentRule.path ? currentRule.path.trim() : '';
      if (!headerName) {
        errors.path = 'Header name is required (e.g. X-Request-Id)';
      }
    }

    return errors;
  };

  const handleSaveRule = () => {
    if (!editingState) return;

    const { index, rule } = editingState;
    const errors = validateRuleForm(rule, index);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const cleanedRule = {
      source: rule.source,
      variable: rule.variable.trim(),
    };

    if (rule.source === 'json') {
      cleanedRule.path = rule.path.trim();
    } else if (rule.source === 'header') {
      cleanedRule.header = rule.path.trim();
      cleanedRule.path = rule.path.trim();
    }

    let nextRules;
    if (index === -1) {
      // Add new
      nextRules = [...rules, cleanedRule];
    } else {
      // Update existing
      nextRules = rules.map((r, i) => (i === index ? cleanedRule : r));
    }

    onChange(nextRules);
    setEditingState(null);
    setFormErrors({});
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Variable size={14} className="text-sky-400" />
          <h4 className="text-xs font-semibold text-slate-300">
            Runtime Extraction
          </h4>
          {rules.length > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-950/40 text-sky-400 border border-sky-800/40">
              {rules.length}
            </span>
          )}
        </div>

        {!editingState && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="flex items-center gap-1 px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium transition-colors"
          >
            <Plus size={12} />
            <span>Add Extraction</span>
          </button>
        )}
      </div>

      {/* Inline Form for Adding / Editing */}
      {editingState && (
        <div className="p-3.5 rounded-md bg-[#131620] border border-[#2b3140] space-y-3 animate-in fade-in duration-100">
          <div className="flex items-center justify-between border-b border-[#232732] pb-2">
            <span className="text-xs font-semibold text-slate-200">
              {editingState.index === -1 ? 'New Extraction Rule' : 'Edit Extraction Rule'}
            </span>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Source Selector */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Extraction Source
              </label>
              <select
                value={editingState.rule.source}
                onChange={(e) => {
                  setEditingState({
                    ...editingState,
                    rule: {
                      ...editingState.rule,
                      source: e.target.value,
                    },
                  });
                  setFormErrors({});
                }}
                className="w-full h-7 bg-[#181b24] border border-[#2b313e] rounded px-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="json">JSON Body</option>
                <option value="header">Response Header</option>
                <option value="text">Plain Text Body</option>
              </select>
            </div>

            {/* Source Expression / Path (Hidden for text) */}
            {editingState.rule.source !== 'text' ? (
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {editingState.rule.source === 'json' ? 'JSON Path' : 'Header Name'}
                </label>
                <input
                  type="text"
                  placeholder={SOURCE_CONFIG[editingState.rule.source]?.placeholder}
                  value={editingState.rule.path}
                  onChange={(e) =>
                    setEditingState({
                      ...editingState,
                      rule: {
                        ...editingState.rule,
                        path: e.target.value,
                      },
                    })
                  }
                  className={cn(
                    'w-full h-7 bg-[#181b24] border rounded px-2 text-xs font-mono text-slate-200 focus:outline-none transition-colors',
                    formErrors.path
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-[#2b313e] focus:border-sky-500'
                  )}
                />
                {formErrors.path && (
                  <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.path}</p>
                )}
              </div>
            ) : (
              <div className="sm:col-span-1 flex items-center pt-4">
                <span className="text-[11px] text-slate-500 italic">
                  Full response body
                </span>
              </div>
            )}

            {/* Target Variable Name */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Target Variable Name
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2 text-slate-500 font-mono text-[11px] pointer-events-none">
                  &#123;&#123;
                </span>
                <input
                  type="text"
                  placeholder="accessToken"
                  value={editingState.rule.variable}
                  onChange={(e) =>
                    setEditingState({
                      ...editingState,
                      rule: {
                        ...editingState.rule,
                        variable: e.target.value,
                      },
                    })
                  }
                  className={cn(
                    'w-full h-7 pl-6 pr-6 bg-[#181b24] border rounded text-xs font-mono text-slate-200 focus:outline-none transition-colors',
                    formErrors.variable
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-[#2b313e] focus:border-sky-500'
                  )}
                />
                <span className="absolute right-2 text-slate-500 font-mono text-[11px] pointer-events-none">
                  &#125;&#125;
                </span>
              </div>
              {formErrors.variable && (
                <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.variable}</p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            {SOURCE_CONFIG[editingState.rule.source]?.helpText}
          </p>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#232732]">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-2.5 py-1 rounded bg-[#1c202c] hover:bg-[#232838] text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveRule}
              className="flex items-center gap-1 px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow"
            >
              <Check size={12} />
              <span>{editingState.index === -1 ? 'Add Rule' : 'Save Rule'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Rules List or Empty State */}
      {rules.length === 0 && !editingState ? (
        <div className="p-4 rounded-md border border-dashed border-[#2b3140] bg-[#111319] text-center space-y-2">
          <p className="text-xs text-slate-400">
            Capture values from this response and reuse them in later requests during a Collection Run.
          </p>
          <button
            type="button"
            onClick={handleStartAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium transition-colors"
          >
            <Plus size={13} />
            <span>Add Extraction Rule</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rules.map((rule, idx) => {
            const src = rule.source?.toLowerCase() || 'json';
            const config = SOURCE_CONFIG[src] || SOURCE_CONFIG.json;
            const expression = rule.path || rule.header || (src === 'text' ? 'Full Body' : '—');
            const Icon = config.icon;

            return (
              <div
                key={idx}
                className="group flex items-center justify-between py-2 px-3 rounded-md bg-[#12141c] border border-[#232732] hover:border-[#2f3544] transition-colors text-xs"
              >
                {/* Rule Summary & Badge */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border shrink-0',
                      config.badge
                    )}
                  >
                    <Icon size={11} />
                    <span>{config.label}</span>
                  </span>

                  <div className="flex items-center gap-1.5 min-w-0 font-mono text-[11px] truncate">
                    <span className="text-slate-300 truncate" title={expression}>
                      {expression}
                    </span>
                    <ArrowRight size={11} className="text-slate-500 shrink-0" />
                    <span className="text-sky-400 font-semibold truncate">
                      &#123;&#123;{rule.variable}&#125;&#125;
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(idx)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1e2330] transition-colors"
                    title="Edit extraction rule"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(idx)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    title="Delete extraction rule"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rules.length > 0 && (
        <div className="p-2.5 rounded bg-[#10121a] border border-[#1e222e] flex items-start gap-2 text-[11px] text-slate-500">
          <AlertCircle size={13} className="text-sky-400 shrink-0 mt-0.5" />
          <span>
            Extracted variables are ephemeral and available to subsequent requests during Collection Runs via <code className="text-sky-400 font-mono text-[10px]">&#123;&#123;variableName&#125;&#125;</code>.
          </span>
        </div>
      )}
    </div>
  );
}

