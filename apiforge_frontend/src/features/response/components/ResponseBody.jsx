import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Copy,
  Check,
  FileQuestion,
  AlertTriangle,
  WrapText,
  Eye,
  FileCode,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import {
  detectContentType,
  isLargePayload,
  parseBodyContent,
} from '../utils/responseFormatters';
import { countJsonNodes } from '../utils/jsonPath';
import JsonTree from './JsonTree';

// Helper to highlight search matches safely and highlight the active match
function highlightText(text, query, activeMatchIndex, matchCounterRef) {
  if (!query || !query.trim() || typeof text !== 'string') return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      const thisMatchIndex = matchCounterRef ? matchCounterRef.current++ : -1;
      const isActive = thisMatchIndex === activeMatchIndex;

      return (
        <mark
          key={i}
          data-match-index={thisMatchIndex}
          className={cn(
            'px-0.5 rounded transition-all',
            isActive
              ? 'bg-amber-400 text-slate-950 font-bold ring-2 ring-amber-300'
              : 'bg-amber-500/30 text-amber-200'
          )}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

// Colorize JSON tokens line by line with IDE syntax highlighting
function renderPrettyValue(valStr, searchQuery, activeMatchIndex, matchCounterRef) {
  const trimmed = valStr.trim();

  // String value
  if (trimmed.startsWith('"')) {
    return (
      <span className="text-emerald-300">
        {highlightText(valStr, searchQuery, activeMatchIndex, matchCounterRef)}
      </span>
    );
  }
  // Number
  if (!isNaN(Number(trimmed.replace(/,$/, '')))) {
    return (
      <span className="text-purple-300 font-semibold">
        {highlightText(valStr, searchQuery, activeMatchIndex, matchCounterRef)}
      </span>
    );
  }
  // Boolean or null
  if (trimmed.startsWith('true') || trimmed.startsWith('false') || trimmed.startsWith('null')) {
    return (
      <span className="text-amber-300 font-semibold">
        {highlightText(valStr, searchQuery, activeMatchIndex, matchCounterRef)}
      </span>
    );
  }

  return (
    <span className="text-slate-300">
      {highlightText(valStr, searchQuery, activeMatchIndex, matchCounterRef)}
    </span>
  );
}

function renderPrettyJsonLines(jsonStr, searchQuery, activeMatchIndex) {
  const lines = jsonStr.split('\n');
  const matchCounterRef = { current: 0 };

  return lines.map((line, idx) => {
    const keyMatch = line.match(/^(\s*)(".*?")(\s*:)(.*)$/);
    if (keyMatch) {
      const [, indent, key, colon, rest] = keyMatch;
      return (
        <div key={idx} className="leading-5 hover:bg-[#181b22] px-2 -mx-2 rounded font-mono">
          <span className="text-slate-600 select-none mr-3 text-[11px] inline-block w-9 text-right">
            {idx + 1}
          </span>
          <span className="text-slate-500">{indent}</span>
          <span className="text-sky-300 font-semibold">
            {highlightText(key, searchQuery, activeMatchIndex, matchCounterRef)}
          </span>
          <span className="text-slate-400">{colon}</span>
          {renderPrettyValue(rest, searchQuery, activeMatchIndex, matchCounterRef)}
        </div>
      );
    }

    return (
      <div key={idx} className="leading-5 hover:bg-[#181b22] px-2 -mx-2 rounded font-mono">
        <span className="text-slate-600 select-none mr-3 text-[11px] inline-block w-9 text-right">
          {idx + 1}
        </span>
        <span className="text-slate-300">
          {highlightText(line, searchQuery, activeMatchIndex, matchCounterRef)}
        </span>
      </div>
    );
  });
}

// Render HTML or XML source code safely with line numbers (NEVER dangerouslySetInnerHTML)
function renderSafeMarkupLines(content, searchQuery, activeMatchIndex) {
  const lines = content.split('\n');
  const matchCounterRef = { current: 0 };

  return lines.map((line, idx) => (
    <div key={idx} className="leading-5 hover:bg-[#181b22] px-2 -mx-2 rounded font-mono">
      <span className="text-slate-600 select-none mr-3 text-[11px] inline-block w-9 text-right">
        {idx + 1}
      </span>
      <span className="text-slate-300">
        {highlightText(line, searchQuery, activeMatchIndex, matchCounterRef)}
      </span>
    </div>
  ));
}

export default function ResponseBody({
  body,
  contentType = '',
  sizeBytes,
  mode = 'pretty',
  searchQuery = '',
  currentMatchIndex = 0,
  onMatchCountChange,
  className,
}) {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [forceRenderLarge, setForceRenderLarge] = useState(false);
  const bodyContainerRef = useRef(null);

  const detectedType = useMemo(
    () => detectContentType(contentType, body),
    [contentType, body]
  );

  const { formattedText, isJson, parsedJson } = useMemo(
    () => parseBodyContent(body),
    [body]
  );

  // Large payload check
  const isLarge = useMemo(() => {
    if (isLargePayload(sizeBytes, formattedText)) return true;
    if (parsedJson && countJsonNodes(parsedJson, 10001) > 10000) return true;
    return false;
  }, [sizeBytes, formattedText, parsedJson]);

  // Compute search match counts
  useEffect(() => {
    if (!searchQuery || !searchQuery.trim() || !formattedText) {
      onMatchCountChange?.(0);
      return;
    }
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = formattedText.match(regex);
    onMatchCountChange?.(matches ? matches.length : 0);
  }, [searchQuery, formattedText, onMatchCountChange]);

  // Scroll active search match into view
  useEffect(() => {
    if (!searchQuery || !bodyContainerRef.current) return;
    const activeEl = bodyContainerRef.current.querySelector(
      `mark[data-match-index="${currentMatchIndex}"]`
    );
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMatchIndex, searchQuery]);

  const handleCopy = () => {
    if (!formattedText) return;
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. EMPTY BODY STATE
  if (body === null || body === undefined || formattedText === '') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-500 font-mono text-xs select-none">
        <div className="w-10 h-10 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-center text-slate-500 mb-2">
          <FileCode size={20} />
        </div>
        <span className="font-semibold text-slate-300">No Response Body</span>
        <span className="text-[11px] text-slate-500 mt-0.5">
          The server returned an empty body (0 bytes) or 204 No Content.
        </span>
      </div>
    );
  }

  // 2. BINARY RESPONSE STATE
  if (detectedType === 'binary') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3 select-none">
        <div className="w-12 h-12 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-center text-sky-400 mb-1">
          <FileQuestion size={28} />
        </div>
        <span className="font-semibold text-sm text-slate-200">
          Binary Response Stream
        </span>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="px-2 py-0.5 rounded bg-[#181b22] border border-[#2b313e]">
            {contentType || 'application/octet-stream'}
          </span>
          {sizeBytes !== undefined && (
            <span className="px-2 py-0.5 rounded bg-[#181b22] border border-[#2b313e]">
              {sizeBytes} bytes
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 max-w-sm">
          Binary payloads (images, audio, zip, wasm, pdf) are not rendered directly as editable text to prevent data distortion.
        </p>
      </div>
    );
  }

  // 3. LARGE RESPONSE GUARD (when not forced)
  if (isLarge && !forceRenderLarge && (mode === 'tree' || mode === 'pretty')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-300 gap-3 select-none">
        <div className="w-12 h-12 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-center justify-center text-amber-400 mb-1">
          <AlertTriangle size={24} />
        </div>
        <span className="font-semibold text-sm text-slate-100">
          Large Response Payload Detected
        </span>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">
          This response is {sizeBytes ? `${(sizeBytes / 1024).toFixed(1)} KB` : 'over 500 KB'}. Rendering rich syntax trees on massive JSON can impact UI responsiveness.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => setForceRenderLarge(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white transition-colors cursor-pointer"
          >
            <Eye size={13} />
            <span>Render {mode === 'tree' ? 'JSON Tree' : 'Pretty View'} Anyway</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-xs font-medium text-slate-300 transition-colors cursor-pointer"
          >
            <Copy size={13} />
            <span>Copy Response</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden', className)}>
      {/* Floating Toolbar: Word wrap toggle & Copy button */}
      <div className="absolute top-2 right-4 z-10 flex items-center gap-1.5 select-none">
        {mode === 'raw' && (
          <button
            type="button"
            onClick={() => setWordWrap(!wordWrap)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-mono transition-colors shadow-md cursor-pointer',
              wordWrap
                ? 'bg-sky-950/80 border-sky-800 text-sky-300'
                : 'bg-[#181b22] hover:bg-[#232732] border-[#2b313e] text-slate-400'
            )}
            title="Toggle word wrap"
          >
            <WrapText size={11} />
            <span>{wordWrap ? 'Wrap' : 'No Wrap'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 font-mono transition-colors shadow-md cursor-pointer"
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

      {/* Main Content Area */}
      <div
        ref={bodyContainerRef}
        className="flex-1 overflow-auto p-4 font-mono text-xs bg-[#090a0f] text-slate-200"
      >
        {/* TREE VIEW */}
        {mode === 'tree' && isJson && parsedJson ? (
          <JsonTree
            data={parsedJson}
            searchQuery={searchQuery}
          />
        ) : mode === 'pretty' && isJson ? (
          /* PRETTY JSON VIEW */
          <pre className="font-mono text-xs leading-relaxed whitespace-pre font-normal">
            {renderPrettyJsonLines(formattedText, searchQuery, currentMatchIndex)}
          </pre>
        ) : mode === 'pretty' && (detectedType === 'html' || detectedType === 'xml') ? (
          /* SAFE HTML / XML SOURCE VIEW (strictly safe text, NO dangerouslySetInnerHTML) */
          <pre className="font-mono text-xs leading-relaxed whitespace-pre font-normal text-slate-300">
            {renderSafeMarkupLines(formattedText, searchQuery, currentMatchIndex)}
          </pre>
        ) : (
          /* RAW / TEXT VIEW */
          <pre
            className={cn(
              'font-mono text-xs leading-relaxed font-normal text-slate-300',
              wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
            )}
          >
            {highlightText(formattedText, searchQuery, currentMatchIndex, { current: 0 })}
          </pre>
        )}
      </div>
    </div>
  );
}
