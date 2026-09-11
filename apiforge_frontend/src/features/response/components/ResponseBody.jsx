import { useState, useEffect } from 'react';
import { Copy, Check, FileQuestion } from 'lucide-react';
import { cn } from '../../../utils/cn';

// Helper to highlight search matches safely
function highlightText(text, query) {
  if (!query || !query.trim() || typeof text !== 'string') return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-500/30 text-amber-200 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// Colorize JSON tokens line by line
function renderPrettyJson(jsonStr, searchQuery) {
  const lines = jsonStr.split('\n');

  return lines.map((line, idx) => {
    const keyMatch = line.match(/^(\s*)(".*?")(\s*:)(.*)$/);
    if (keyMatch) {
      const [, indent, key, colon, rest] = keyMatch;
      return (
        <div key={idx} className="leading-5 hover:bg-[#181b22] px-2 -mx-2 rounded">
          <span className="text-slate-600 select-none mr-3 text-[11px] inline-block w-8 text-right font-mono">
            {idx + 1}
          </span>
          <span className="text-slate-500">{indent}</span>
          <span className="text-sky-300 font-semibold">{highlightText(key, searchQuery)}</span>
          <span className="text-slate-400">{colon}</span>
          <span className="text-emerald-300">{highlightText(rest, searchQuery)}</span>
        </div>
      );
    }

    return (
      <div key={idx} className="leading-5 hover:bg-[#181b22] px-2 -mx-2 rounded">
        <span className="text-slate-600 select-none mr-3 text-[11px] inline-block w-8 text-right font-mono">
          {idx + 1}
        </span>
        <span className="text-slate-300">{highlightText(line, searchQuery)}</span>
      </div>
    );
  });
}

function parseBodyContent(body) {
  if (body === null || body === undefined) {
    return { formattedText: '', isJson: false };
  }

  if (typeof body === 'object') {
    try {
      return { formattedText: JSON.stringify(body, null, 2), isJson: true };
    } catch {
      return { formattedText: String(body), isJson: false };
    }
  }

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return { formattedText: JSON.stringify(parsed, null, 2), isJson: true };
      } catch {
        return { formattedText: body, isJson: false };
      }
    }
    return { formattedText: body, isJson: false };
  }

  return { formattedText: String(body), isJson: false };
}

export default function ResponseBody({
  body,
  contentType = '',
  mode = 'pretty',
  searchQuery = '',
  onMatchCountChange,
  className,
}) {
  const [copied, setCopied] = useState(false);

  const isBinary =
    Boolean(contentType) &&
    (contentType.includes('image/') ||
      contentType.includes('audio/') ||
      contentType.includes('video/') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('application/pdf'));

  const { formattedText, isJson } = parseBodyContent(body);

  useEffect(() => {
    if (!searchQuery || !searchQuery.trim() || !formattedText) {
      onMatchCountChange?.(0);
      return;
    }
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = formattedText.match(regex);
    onMatchCountChange?.(matches ? matches.length : 0);
  }, [searchQuery, formattedText, onMatchCountChange]);

  const handleCopy = () => {
    if (!formattedText) return;
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (body === null || body === undefined || formattedText === '') {
    return (
      <div className="py-12 text-center text-slate-500 font-mono text-xs">
        &lt;Empty Response Body&gt;
      </div>
    );
  }

  if (isBinary) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
        <FileQuestion size={32} className="text-slate-500" />
        <span className="font-semibold text-xs">Binary response stream ({contentType})</span>
        <span className="text-[11px] text-slate-500">Binary preview is not rendered directly in text mode.</span>
      </div>
    );
  }

  return (
    <div className={cn('relative flex-1 flex flex-col min-h-0', className)}>
      <div className="absolute top-2 right-4 z-10">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 font-mono transition-colors shadow-md"
          title="Copy response body"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} className="text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-xs bg-[#090a0f] text-slate-200">
        {mode === 'pretty' && isJson ? (
          <pre className="font-mono text-xs leading-relaxed whitespace-pre font-normal">
            {renderPrettyJson(formattedText, searchQuery)}
          </pre>
        ) : (
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap font-normal text-slate-300">
            {highlightText(formattedText, searchQuery)}
          </pre>
        )}
      </div>
    </div>
  );
}

