import { ShieldAlert } from 'lucide-react';
import { cn } from '../../../utils/cn';
import ExtractionEditor from './ExtractionEditor';

export default function RequestSettings({
  settings = { timeout: 30000, followRedirects: true, extract: [] },
  onUpdateSetting,
  className,
}) {
  return (
    <div className={cn('p-4 space-y-6 max-w-2xl', className)}>
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Request Settings
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure runtime behavior and response variable extraction for this request
        </p>
      </div>

      <div className="space-y-4 bg-[#111318] p-4 rounded-md border border-[#232732]">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Request Timeout (ms)
          </label>
          <input
            type="number"
            min={500}
            max={300000}
            step={500}
            value={settings.timeout ?? 30000}
            onChange={(e) => onUpdateSetting('timeout', parseInt(e.target.value, 10) || 30000)}
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Maximum duration to wait for a response before timing out (default: 30,000 ms).
          </p>
        </div>

        <div className="pt-3 border-t border-[#232732] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">
              Follow HTTP Redirects
            </div>
            <p className="text-[11px] text-slate-500">
              Automatically follow 3xx HTTP redirects (up to 5 hops).
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.followRedirects !== false}
              onChange={(e) => onUpdateSetting('followRedirects', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#2b313e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>
      </div>

      {/* Response Variable Extraction (Step 26 Request Chaining) */}
      <div className="pt-2 border-t border-[#232732]">
        <ExtractionEditor
          rules={settings.extract || []}
          onChange={(newRules) => onUpdateSetting('extract', newRules)}
        />
      </div>

      <div className="p-3 rounded-md bg-[#181b22] border border-[#232732] flex items-start gap-2.5 text-xs text-slate-400">
        <ShieldAlert size={16} className="text-sky-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300">SSRF & Security Enforcement</span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Outbound requests are strictly guarded by APIForge backend DNS resolution and IP filtering. Loopback, link-local, private, and AWS metadata addresses are automatically blocked in non-test environments.
          </p>
        </div>
      </div>
    </div>
  );
}


