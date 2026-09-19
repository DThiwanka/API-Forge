import { useSettingsStore, FONT_SIZES, RESPONSE_MODES } from '../../../stores/settingsStore';
import { Code2, WrapText, Sparkles } from 'lucide-react';
import { cn } from '../../../utils/cn';

const SAMPLE_PAYLOAD = `{
  "api": "APIForge Execution Engine",
  "version": "2.0.0",
  "environment": "Production-US-East",
  "status": 200,
  "features": [
    "SSRF Protection",
    "Global Search (Ctrl+K)",
    "Keyboard Shortcuts",
    "Realtime Collaboration"
  ],
  "note": "This is a live preview demonstrating your active font size and word wrapping settings."
}`;

export default function DeveloperSettings() {
  const {
    editorFontSize,
    editorWordWrap,
    defaultResponseMode,
    autoFormatOnSave,
    setEditorFontSize,
    setEditorWordWrap,
    setDefaultResponseMode,
    setAutoFormatOnSave,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-100 tracking-wide">Editor & Developer Tools</h2>
        <p className="text-xs text-slate-400 mt-1">
          Fine-tune code editor parameters, response rendering, and payload formatting.
        </p>
      </div>

      {/* Font Size */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">Editor Font Size</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Applies to Monaco editor, raw headers, JSON payloads, and response inspector.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setEditorFontSize(size)}
              className={cn(
                'px-3.5 py-1.5 rounded text-xs font-mono transition-all',
                editorFontSize === size
                  ? 'bg-blue-600 text-white font-semibold ring-1 ring-blue-400/50'
                  : 'bg-[#0d1017] border border-[#232732] text-slate-300 hover:border-slate-700'
              )}
            >
              {size}px
            </button>
          ))}
        </div>
      </div>

      {/* Editor Word Wrap & Auto Format */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">Code Editor Behaviors</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure line wrapping and automatic document formatting.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WrapText className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-xs font-medium text-slate-300">Word Wrap</div>
                <div className="text-[11px] text-slate-500">Wrap long lines to fit the editor viewport width.</div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={editorWordWrap}
              onClick={() => setEditorWordWrap(!editorWordWrap)}
              className={cn(
                'relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500',
                editorWordWrap ? 'bg-blue-600' : 'bg-slate-700'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  editorWordWrap ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          <div className="border-t border-[#232732] pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-xs font-medium text-slate-300">Auto-Format JSON on Save</div>
                <div className="text-[11px] text-slate-500">Automatically beautify JSON request bodies when pressing Save.</div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoFormatOnSave}
              onClick={() => setAutoFormatOnSave(!autoFormatOnSave)}
              className={cn(
                'relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500',
                autoFormatOnSave ? 'bg-blue-600' : 'bg-slate-700'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  autoFormatOnSave ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Default Response Mode */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-200">Default Response Mode</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Initial display format for API execution response payloads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {RESPONSE_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDefaultResponseMode(mode)}
              className={cn(
                'px-4 py-2 rounded text-xs capitalize font-medium transition-all',
                defaultResponseMode === mode
                  ? 'bg-blue-600/15 border border-blue-500/40 text-blue-400 font-semibold'
                  : 'bg-[#0d1017] border border-[#232732] text-slate-300 hover:border-slate-700'
              )}
            >
              {mode} view
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview Box */}
      <div className="p-5 rounded-lg bg-[#14171f] border border-[#232732] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-200">Live Editor Preview</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {editorFontSize}px • {editorWordWrap ? 'Word Wrap ON' : 'Word Wrap OFF'}
          </span>
        </div>

        <pre
          className="p-4 rounded-md bg-[#0b0e14] border border-[#1e2330] text-slate-300 font-mono overflow-auto"
          style={{
            fontSize: `${editorFontSize}px`,
            whiteSpace: editorWordWrap ? 'pre-wrap' : 'pre',
            wordBreak: editorWordWrap ? 'break-word' : 'normal',
          }}
        >
          {SAMPLE_PAYLOAD}
        </pre>
      </div>
    </div>
  );
}
