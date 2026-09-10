import React from 'react';

export default function CanvasControls() {
  return (
    <div className="absolute bottom-4 right-4 z-10 bg-slate-900 border border-slate-800 rounded-lg p-1 flex gap-1 shadow-lg">
      <button className="w-7 h-7 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded">+</button>
      <button className="w-7 h-7 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded">-</button>
      <button className="w-7 h-7 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded">⤢</button>
    </div>
  );
}
