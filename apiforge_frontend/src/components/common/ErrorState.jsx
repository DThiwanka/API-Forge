import React from 'react';

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h4 className="text-base font-semibold text-rose-400 mb-1">{title}</h4>
      {message && <p className="text-sm text-slate-400 max-w-md mb-4">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-xs bg-rose-900/40 text-rose-300 border border-rose-700 rounded hover:bg-rose-900/60 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
