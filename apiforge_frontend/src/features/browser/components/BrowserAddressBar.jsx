import { memo, useState } from 'react';
import { Lock, Globe, ArrowRight, Loader2, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

function BrowserAddressBarComponent({
  value = '',
  onChange,
  onNavigate,
  isLoading = false,
}) {
  const [isFocused, setIsFocused] = useState(false);

  const isHttps = value.toLowerCase().startsWith('https://');
  const isHttp = value.toLowerCase().startsWith('http://');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value && value.trim()) {
      onNavigate(value.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative flex-1 flex items-center h-7 rounded-lg bg-[#141722] border transition-all duration-150 px-2.5 max-w-2xl',
        isFocused
          ? 'border-sky-500 ring-1 ring-sky-500/50 shadow-xs'
          : 'border-[#262c3b] hover:border-slate-500'
      )}
    >
      {/* Protocol / Security Icon */}
      <div className="shrink-0 mr-2">
        {isHttps ? (
          <Lock size={12} className="text-emerald-400" title="Secure HTTPS Connection" />
        ) : isHttp ? (
          <Lock size={12} className="text-amber-400" title="Unencrypted HTTP Connection" />
        ) : (
          <Globe size={12} className="text-slate-500" />
        )}
      </div>

      {/* URL Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Enter URL (e.g. https://httpbin.org/get or jsonplaceholder.typicode.com)..."
        className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
      />

      {/* Clear Button */}
      {value && !isLoading && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="p-0.5 rounded text-slate-500 hover:text-slate-300 transition-colors cursor-pointer mr-1"
          title="Clear address bar"
        >
          <X size={11} />
        </button>
      )}

      {/* Loading or Go Button */}
      <div className="shrink-0 ml-1">
        {isLoading ? (
          <Loader2 size={12} className="animate-spin text-sky-400" />
        ) : (
          <button
            type="submit"
            className="p-0.5 rounded text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
            title="Navigate (Enter)"
            aria-label="Navigate"
          >
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </form>
  );
}

export const BrowserAddressBar = memo(BrowserAddressBarComponent);
export default BrowserAddressBar;

