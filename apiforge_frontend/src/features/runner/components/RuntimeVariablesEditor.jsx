import { useState } from 'react';
import { Variable, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RuntimeVariablesEditor({
  variables = [],
  onChange,
  disabled = false,
  className,
}) {
  const [revealedIds, setRevealedIds] = useState(new Set());

  const handleAdd = () => {
    const newItem = {
      id: String(Date.now() + Math.random()),
      key: '',
      value: '',
      isSecret: false,
    };
    onChange([...variables, newItem]);
  };

  const handleRemove = (id) => {
    onChange(variables.filter((v) => v.id !== id));
  };

  const handleUpdate = (id, field, val) => {
    onChange(
      variables.map((v) => {
        if (v.id === id) {
          const updated = { ...v, [field]: val };
          // If key looks like secret/token/password/key, mark as secret automatically if not already set
          if (field === 'key' && /token|secret|password|key|auth/i.test(val)) {
            updated.isSecret = true;
          }
          return updated;
        }
        return v;
      })
    );
  };

  const toggleReveal = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Variable size={13} className="text-sky-400" />
          <span>Runtime Variables</span>
          <span className="text-[10px] font-normal text-slate-500">(in-memory only)</span>
        </label>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Variable size={13} className="text-sky-400" />
            <span>Runtime Variables</span>
          </label>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Runtime variables apply only to this collection run.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 border border-sky-800/40 transition-colors disabled:opacity-50"
          title="Add a temporary runtime variable"
        >
          <Plus size={11} />
          <span>Add Variable</span>
        </button>
      </div>

      {variables.length === 0 ? (
        <div className="py-3 px-3 rounded border border-dashed border-[#2b3140] bg-[#11131a] text-center text-[11px] text-slate-500">
          No temporary variables defined. Variables added here override environment values for this run only.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
          {variables.map((item) => {
            const isRevealed = revealedIds.has(item.id);
            const isMasked = item.isSecret && !isRevealed;

            return (
              <div key={item.id} className="flex items-center gap-1.5 text-xs">
                {/* Key Input */}
                <input
                  type="text"
                  placeholder="variable_key"
                  value={item.key}
                  disabled={disabled}
                  onChange={(e) => handleUpdate(item.id, 'key', e.target.value)}
                  className="w-1/2 h-7 px-2.5 bg-[#141720] border border-[#2b3140] rounded text-slate-200 placeholder-slate-600 font-mono text-[11px] focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50"
                />

                {/* Value Input with Eye Toggle */}
                <div className="relative w-1/2 flex items-center">
                  <input
                    type={isMasked ? 'password' : 'text'}
                    placeholder="value"
                    value={item.value}
                    disabled={disabled}
                    onChange={(e) => handleUpdate(item.id, 'value', e.target.value)}
                    className="w-full h-7 pl-2.5 pr-7 bg-[#141720] border border-[#2b3140] rounded text-slate-200 placeholder-slate-600 font-mono text-[11px] focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50"
                  />
                  {item.isSecret && (
                    <button
                      type="button"
                      onClick={() => toggleReveal(item.id)}
                      className="absolute right-1.5 text-slate-500 hover:text-slate-300 p-0.5"
                      title={isRevealed ? 'Hide secret value' : 'Show secret value'}
                    >
                      {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  disabled={disabled}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors disabled:opacity-50 shrink-0"
                  title="Remove variable"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

