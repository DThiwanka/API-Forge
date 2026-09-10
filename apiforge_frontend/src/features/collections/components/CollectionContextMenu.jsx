import React from 'react';

export default function CollectionContextMenu({ x, y, onAddRequest, onAddFolder, onDelete }) {
  return (
    <div
      className="fixed z-50 bg-slate-800 border border-slate-700 rounded shadow-xl py-1 w-36 text-xs"
      style={{ left: x, top: y }}
    >
      <button onClick={onAddRequest} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 text-slate-200">
        New Request
      </button>
      <button onClick={onAddFolder} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 text-slate-200">
        New Folder
      </button>
      <button onClick={onDelete} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 text-rose-400">
        Delete
      </button>
    </div>
  );
}
