import { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { suggestVariableName, formatPrimitiveValue } from '../utils/responseActionHelpers';
import useRequestStore from '../../requests/store/requestStore';
import { useToastStore } from '../../../stores/toastStore';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

const VARIABLE_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export default function CreateExtractionDialog({
  isOpen,
  onClose,
  initialPath = '',
  initialSource = 'json',
  value = undefined,
}) {
  if (!isOpen) return null;

  return (
    <CreateExtractionForm
      key={initialPath + initialSource}
      onClose={onClose}
      initialPath={initialPath}
      initialSource={initialSource}
      value={value}
    />
  );
}

function CreateExtractionForm({
  onClose,
  initialPath = '',
  initialSource = 'json',
  value,
}) {
  const [source, setSource] = useState(initialSource);
  const [path, setPath] = useState(initialPath);
  const [variable, setVariable] = useState(() => suggestVariableName(initialPath));
  const [error, setError] = useState(null);

  const settings = useRequestStore((s) => s.settings) || {};
  const updateSetting = useRequestStore((s) => s.updateSetting);

  const existingRules = settings.extract || [];
  const isDuplicateName = existingRules.some(
    (r) => r.variable?.toLowerCase() === variable.trim().toLowerCase()
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const trimmedPath = path.trim();
    const trimmedVar = variable.trim();

    if (!trimmedPath) {
      setError('Path or header name is required');
      return;
    }

    if (!trimmedVar) {
      setError('Variable name is required');
      return;
    }

    if (!VARIABLE_REGEX.test(trimmedVar)) {
      setError(
        'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores (e.g. userId, accessToken)'
      );
      return;
    }

    const newRule = {
      source,
      path: trimmedPath,
      variable: trimmedVar,
    };

    const nextRules = [...existingRules, newRule];
    updateSetting('extract', nextRules);

    useToastStore.getState().toast.success(`Extraction rule added for {{${trimmedVar}}}`);
    onClose();
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Create Variable Extraction"
      className="bg-[#111318] border-[#232732] max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Source selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Extraction Source
          </label>
          <Select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs focus:ring-sky-500"
          >
            <option value="json">JSON Body</option>
            <option value="header">Response Header</option>
            <option value="text">Plain Text</option>
          </Select>
        </div>

        {/* Path Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-300">
              {source === 'header' ? 'Header Name' : 'JSON Path'}
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              {source === 'header' ? 'e.g. X-Request-ID' : 'e.g. $.user.id'}
            </span>
          </div>
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder={source === 'header' ? 'X-Auth-Token' : '$.token'}
            className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs font-mono focus:ring-sky-500"
            autoFocus
          />
          {value !== undefined && (
            <div className="mt-1 text-[11px] text-slate-500 font-mono truncate">
              Node value: <span className="text-slate-300">{formatPrimitiveValue(value)}</span>
            </div>
          )}
        </div>

        {/* Variable Name Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-300">
              Variable Name
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              Use as {`{{${variable || 'var'}}}`}
            </span>
          </div>
          <Input
            value={variable}
            onChange={(e) => setVariable(e.target.value)}
            placeholder="e.g. userId"
            className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs font-mono focus:ring-sky-500"
          />

          {isDuplicateName && (
            <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-400">
              <AlertTriangle size={11} />
              <span>A rule extracting to &#39;{variable}&#39; already exists in this request.</span>
            </div>
          )}
        </div>

        {/* Security & Runtime Notice */}
        <div className="p-2.5 rounded bg-[#14171f] border border-[#232732] text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>
            This extraction rule will extract data dynamically during execution. The current response value will not be persisted as a static secret.
          </span>
        </div>

        {/* Dialog Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#232732]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="text-xs px-3 py-1.5 bg-[#181b22] hover:bg-[#202531] border border-[#2b313e] text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Save Extraction Rule
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
