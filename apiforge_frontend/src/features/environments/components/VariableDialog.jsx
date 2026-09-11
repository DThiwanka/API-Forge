import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Lock, Loader2, AlertCircle } from 'lucide-react';
import {
  useCreateVariableMutation,
  useUpdateVariableMutation,
} from '../hooks/useEnvironments';

const VARIABLE_KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export default function VariableDialog({
  isOpen,
  onClose,
  workspaceId,
  environmentId,
  initialVariable = null, // null for create, object for edit
}) {
  if (!isOpen) return null;

  return (
    <VariableDialogForm
      onClose={onClose}
      workspaceId={workspaceId}
      environmentId={environmentId}
      initialVariable={initialVariable}
    />
  );
}

function VariableDialogForm({
  onClose,
  workspaceId,
  environmentId,
  initialVariable,
}) {
  const isEditing = Boolean(initialVariable);

  const [key, setKey] = useState(initialVariable?.key || '');
  // For editing existing secret, initial value should be empty so we don't send masked string
  const [value, setValue] = useState(
    isEditing && initialVariable.isSecret ? '' : initialVariable?.value || ''
  );
  const [isSecret, setIsSecret] = useState(Boolean(initialVariable?.isSecret));
  const [errorMessage, setErrorMessage] = useState('');

  const createMutation = useCreateVariableMutation(workspaceId, environmentId);
  const updateMutation = useUpdateVariableMutation(workspaceId, environmentId);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      setErrorMessage('Variable key is required');
      return;
    }

    if (!VARIABLE_KEY_REGEX.test(trimmedKey)) {
      setErrorMessage(
        'Invalid key format. Keys must start with a letter or underscore and contain only alphanumeric characters and underscores.'
      );
      return;
    }

    setErrorMessage('');

    if (isEditing) {
      const payload = {
        variableId: initialVariable.id,
        key: trimmedKey,
        isSecret,
      };

      // Only send value if the user entered something or if it's not a secret
      if (initialVariable.isSecret) {
        if (value.length > 0) {
          payload.value = value;
        }
      } else {
        payload.value = value;
      }

      updateMutation.mutate(payload, {
        onSuccess: () => onClose(),
        onError: (err) => {
          const status = err?.response?.status;
          if (status === 409) {
            setErrorMessage(`Variable key '${trimmedKey}' already exists in this environment`);
          } else if (status === 403) {
            setErrorMessage('You do not have permission to edit variables (Admin required)');
          } else {
            setErrorMessage(err?.response?.data?.message || err.message || 'Failed to update variable');
          }
        },
      });
    } else {
      createMutation.mutate(
        {
          key: trimmedKey,
          value,
          isSecret,
        },
        {
          onSuccess: () => onClose(),
          onError: (err) => {
            const status = err?.response?.status;
            if (status === 409) {
              setErrorMessage(`Variable key '${trimmedKey}' already exists in this environment`);
            } else if (status === 403) {
              setErrorMessage('You do not have permission to create variables (Admin required)');
            } else {
              setErrorMessage(err?.response?.data?.message || err.message || 'Failed to create variable');
            }
          },
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md rounded-xl bg-[#14171f] border border-[#2b313e] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#232732] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            {isEditing ? (
              <>
                <Edit2 size={15} className="text-sky-400" />
                <span>Edit Variable</span>
              </>
            ) : (
              <>
                <Plus size={16} className="text-sky-400" />
                <span>Add Variable</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#232732] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errorMessage && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle size={14} className="flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Variable Key <span className="text-rose-400">*</span>
            </label>
            <input
              autoFocus={!isEditing}
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. baseUrl, apiKey, token"
              className="w-full px-3 py-1.5 rounded-md bg-[#181b22] border border-[#2b313e] focus:border-sky-500 focus:outline-none text-xs font-mono text-sky-400 placeholder:text-slate-500"
            />
            <span className="text-[10px] text-slate-500 font-mono">
              Alphanumeric and underscores only (e.g. &#123;&#123;{key.trim() || 'key'}&#125;&#125;)
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300">
                Variable Value
              </label>
              {isEditing && initialVariable.isSecret && (
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <Lock size={10} /> Current: ••••••••
                </span>
              )}
            </div>

            <textarea
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                isEditing && initialVariable.isSecret
                  ? 'Leave blank to keep existing secret value'
                  : 'Enter variable value'
              }
              className="w-full px-3 py-1.5 rounded-md bg-[#181b22] border border-[#2b313e] focus:border-sky-500 focus:outline-none text-xs font-mono text-slate-200 placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Secret Checkbox */}
          <div className="p-3 rounded-lg bg-[#111318] border border-[#232732] flex items-start gap-2.5">
            <input
              type="checkbox"
              id="var-secret"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
              className="mt-0.5 rounded bg-[#181b22] border-[#2b313e] text-sky-500 focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="var-secret" className="text-xs cursor-pointer select-none">
              <div className="font-medium text-slate-200 flex items-center gap-1">
                <Lock size={11} className={isSecret ? 'text-amber-400' : 'text-slate-400'} />
                <span>Mask Value as Secret</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Secret variables are masked by the backend and never exposed in cleartext.
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#232732]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#181b22] hover:bg-[#232732] text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !key.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Add Variable'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

