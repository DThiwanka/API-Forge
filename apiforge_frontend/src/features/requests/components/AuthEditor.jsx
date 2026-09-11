import { useState } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
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
  className,
}) {
  const [showSecret, setShowSecret] = useState(false);

  const authType = auth.type || 'none';

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
                'px-2.5 py-1 text-xs font-medium rounded transition-colors',
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
        <div className="py-8 text-center text-slate-500">
          <Shield size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
          <p className="text-xs">No authorization credentials will be sent with this request.</p>
        </div>
      )}

      {authType === 'bearer' && (
        <div className="space-y-3 bg-[#111318] p-4 rounded-md border border-[#232732]">
          <label className="block text-xs font-medium text-slate-300">
            Bearer Token
          </label>
          <div className="relative flex items-center">
            <input
              type={showSecret ? 'text' : 'password'}
              value={auth.bearer?.token || ''}
              onChange={(e) => onUpdateBearer('token', e.target.value)}
              placeholder="Token or {{token}}"
              className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 text-slate-500 hover:text-slate-300"
              title={showSecret ? 'Hide token' : 'Show token'}
            >
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Will be sent as <code className="text-slate-400">Authorization: Bearer &lt;token&gt;</code>
          </p>
        </div>
      )}

      {authType === 'basic' && (
        <div className="space-y-3 bg-[#111318] p-4 rounded-md border border-[#232732]">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={auth.basic?.username || ''}
              onChange={(e) => onUpdateBasic('username', e.target.value)}
              placeholder="Username or {{username}}"
              className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showSecret ? 'text' : 'password'}
                value={auth.basic?.password || ''}
                onChange={(e) => onUpdateBasic('password', e.target.value)}
                placeholder="Password or {{password}}"
                className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 text-slate-500 hover:text-slate-300"
                title={showSecret ? 'Hide password' : 'Show password'}
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Will be base64-encoded and sent as <code className="text-slate-400">Authorization: Basic &lt;credentials&gt;</code>
          </p>
        </div>
      )}

      {authType === 'api-key' && (
        <div className="space-y-3 bg-[#111318] p-4 rounded-md border border-[#232732]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Key
              </label>
              <input
                type="text"
                value={auth.apiKey?.key || ''}
                onChange={(e) => onUpdateApiKey('key', e.target.value)}
                placeholder="e.g. X-API-Key or api_key"
                className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Add To
              </label>
              <select
                value={auth.apiKey?.addTo || 'header'}
                onChange={(e) => onUpdateApiKey('addTo', e.target.value)}
                className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Value
            </label>
            <div className="relative flex items-center">
              <input
                type={showSecret ? 'text' : 'password'}
                value={auth.apiKey?.value || ''}
                onChange={(e) => onUpdateApiKey('value', e.target.value)}
                placeholder="Value or {{apiKey}}"
                className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 text-slate-500 hover:text-slate-300"
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

