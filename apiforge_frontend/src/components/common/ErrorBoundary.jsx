import React from 'react';
import { AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react';

/**
 * Top-level React Error Boundary
 * 
 * Catches unhandled render phase errors, logs diagnostics safely,
 * and presents a graceful recovery UI with reload affordance.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log in development console only
    if (typeof console !== 'undefined' && console.error) {
      console.error('ErrorBoundary caught an unhandled rendering error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'An unexpected rendering error occurred.';

      return (
        <div className="min-h-screen bg-[#0d0f14] text-slate-200 flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#12151c] border border-[#2b313e] shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-950/40 border border-amber-600/40 flex items-center justify-center mx-auto text-amber-400 shadow-md">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-base font-semibold text-slate-100 tracking-wide">
                Something went wrong
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                APIForge couldn't render this screen.
              </p>
            </div>

            {/* Safe technical disclosure without stack traces */}
            <details className="text-left p-2.5 rounded bg-[#090a0f] border border-[#232732] text-[11px] font-mono text-slate-400">
              <summary className="cursor-pointer text-slate-300 hover:text-white flex items-center gap-1 font-sans">
                <ChevronDown size={12} />
                <span>Technical details</span>
              </summary>
              <div className="mt-2 text-rose-300 text-[11px] break-words">
                {errorMsg}
              </div>
            </details>

            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-medium transition-all shadow-md cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

