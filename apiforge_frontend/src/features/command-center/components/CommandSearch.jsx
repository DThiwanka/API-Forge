import React from 'react';

export default function CommandSearch() {
  return (
    <div className="p-3 border-b border-slate-800">
      <input
        type="text"
        placeholder="Type a command or search..."
        className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
        autoFocus
      />
    </div>
  );
}
