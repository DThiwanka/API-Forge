import { useState, useMemo } from 'react';
import { Eye, EyeOff, Shield, Lock, CheckCircle2 } from 'lucide-react';
import VariableInput from './VariableInput';
import { cn } from '../../../utils/cn';

const AUTH_TYPES = [
  { id: 'none', label: 'No Auth' },
  { id: 'bearer', label: 'Bearer Token' },
  { id: 'basic', label: 'Basic Auth' },
  { id: 'api-key', label: 'API Key' },
];

export default function AuthEditor({
  auth = { type: 'none' },
  onAuthTypeChange,
  onUpdateBearer,
  onUpdateBasic,
  onUpdateApiKey,
  variables = [],
  activeEnvName,
  className,
}) {
  const [showSecret, setShowSecret] = useState(false);

  const authType = auth.type || 'none';

  // Compute safe preview that never exposes literal secrets
  const authPreview = useMemo(() => {
    switch (authType) {
      case 'bearer': {
        const token = auth.bearer?.token?.trim() || '';
        if (!token) return { target: 'Header', text: 'Authorization: Bearer <empty>' };
        if (token.startsWith('{{') && token.endsWith('}}')) {
          return { target: 'Header', text: `Authorization: Bearer ${token}` };
        }
        return { target: 'Header', text: 'Authorization: Bearer ••••••••' };
      }
      case 'basic': {
        const user = auth.basic?.username?.trim() || 'user';
        const pass = auth.basic?.password?.trim() || '';
        const passDisplay = pass.startsWith('{{') && pass.endsWith('}}') ? pass : '••••••••';
        return {
          target: 'Header',
          text: `Authorization: Basic [base64(${user}:${passDisplay})]`,
        };
      }
      case 'api-key': {
        const key = auth.apiKey?.key?.trim() || 'api_key';
        const val = auth.apiKey?.value?.trim() || '';
        const addTo = auth.apiKey?.addTo || 'header';
        const valDisplay = val.startsWith('{{') && val.endsWith('}}') ? val : '••••••••';

        if (addTo === 'query') {
          return { target: 'Query Parameter', text: `?${key}=${valDisplay}` };
        }
        return { target: 'Header', text: `${key}: ${valDisplay}` };
      }
      default:
        return null;
    }
  }, [authType, auth]);

  return (
    <div className={cn('p-4 space-y-4 max-w-2xl', className)}>
      <div className="flex items-center justify-between pb-3 border-b border-[#232732]">
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Authorization
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure authentication credentials for this request
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#14171f] p-0.5 rounded-md border border-[#2b313e]">
          {AUTH_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => onAuthTypeChange(type.id)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer',
                authType === type.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {authType === 'none' && (
        <div className="py-8 text-center text-slate-500 border border-dashed border-[#232732] rounded-md bg-[#111318]/50">
          <Shield size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
          <p className="text-xs">No authorization credentials will be sent with this request.</p>
        </div>
      )}

      {authType === 'bearer' && (
        <div className="space-y-3 bg-[#111318] p-4 rounded-md border border-[#232732]">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-slate-300">
              Bearer Token
            </label>
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
              title={showSecret ? 'Hide token' : 'Show token'}
            >
              {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{showSecret ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          <div className="bg-[#181b22] border border-[#2b313e] rounded px-3 py-1.5 focus-within:border-sky-500">
            <VariableInput
              type={showSecret ? 'text' : 'password'}
              value={auth.bearer?.token || ''}
              onChange={(val) => onUpdateBearer('token', val)}
              placeholder="Token or {{token}}"
              variables={variables}
              activeEnvName={activeEnvName}
              pickerButtonTitle="Insert variable into token..."
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Will be sent as <code className="text-slate-400 font-mono">Authorization: Bearer &lt;token&gt;</code>
          </p>
        </div>
      )}

      {authType === 'basic' && (
        <div className="space-y-3 bg-[#111318] p-4 rounded-md border border-[#232732]">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Username
            </label>
            <div className="bg-[#181b22] border border-[#2b313e] rounded px-3 py-1.5 focus-within:border-sky-500">
              <VariableInput
                value={auth.basic?.username || ''}
                onChange={(val) => onUpdateBasic('username', val)}
                placeholder="Username or {{username}}"
                variables={variables}
                activeEnvName={activeEnvName}
                pickerButtonTitle="Insert variable into username..."
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
                title={showSecret ? 'Hide password' : 'Show password'}
              >
                {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showSecret ? 'Hide' : 'Show'}</span>
              </button>
            </div>

            <div className="bg-[#181b22] border border-[#2b313e] rounded px-3 py-1.5 focus-within:border-sky-500">
              <VariableInput
                type={showSecret ? 'text' : 'password'}
                value={auth.basic?.password || ''}
                onChange={(val) => onUpdateBasic('password', val)}
                placeholder="Password or {{password}}"
                variables={variables}
                activeEnvName={activeEnvName}
                pickerButtonTitle="Insert variable into password..."
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Will be base64-encoded and sent as <code className="text-slate-400 font-mono">Authorization: Basic &lt;credentials&gt;</code>
          </p>
        </div>
      )}

      {authType === 'api-key' && (
        <div className="space-y-3 bg-[#111318] p-4 rounded-md border border-[#232732]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Key Name
              </label>
              <div className="bg-[#181b22] border border-[#2b313e] rounded px-3 py-1.5 focus-within:border-sky-500">
                <VariableInput
                  value={auth.apiKey?.key || ''}
                  onChange={(val) => onUpdateApiKey('key', val)}
                  placeholder="e.g. X-API-Key or api_key"
                  variables={variables}
                  activeEnvName={activeEnvName}
                  pickerButtonTitle="Insert variable into key..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Add To
              </label>
              <select
                value={auth.apiKey?.addTo || 'header'}
                onChange={(e) => onUpdateApiKey('addTo', e.target.value)}
                className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Value
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showSecret ? 'Hide' : 'Show'}</span>
              </button>
            </div>

            <div className="bg-[#181b22] border border-[#2b313e] rounded px-3 py-1.5 focus-within:border-sky-500">
              <VariableInput
                type={showSecret ? 'text' : 'password'}
                value={auth.apiKey?.value || ''}
                onChange={(val) => onUpdateApiKey('value', val)}
                placeholder="Value or {{apiKey}}"
                variables={variables}
                activeEnvName={activeEnvName}
                pickerButtonTitle="Insert variable into API key value..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Safe Auth Summary Preview Box */}
      {authPreview && (
        <div className="bg-[#121620] border border-[#243048] rounded-md p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sky-400 text-xs font-medium">
              <Lock size={13} />
              <span>Safe Authorization Preview ({authPreview.target})</span>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
              <CheckCircle2 size={12} /> Confidential
            </span>
          </div>

          <div className="bg-[#0b0e14] border border-[#1b2333] rounded px-2.5 py-1.5 font-mono text-xs text-sky-200">
            {authPreview.text}
          </div>

          <p className="text-[10px] text-slate-500 leading-normal">
            APIForge automatically attaches this credential at request execution. Sensitive tokens and secrets are never exposed in plaintext logs or serialized previews.
          </p>
        </div>
      )}
    </div>
  );
}
