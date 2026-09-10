import React from 'react';

export default function NodeContextMenu({ x, y, onClose, onDelete }) {
  return (
    <div
      className="fixed z-50 bg-slate-800 border border-slate-700 rounded shadow-xl py-1 w-32 text-xs"
      style={{ left: x, top: y }}
    >
      <button onClick={onDelete} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 text-rose-400">
        Delete Node
      </button>
    </div>
  );
}
