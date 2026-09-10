import React from 'react';

export default function CanvasMiniMap() {
  return (
    <div className="absolute bottom-4 left-4 z-10 w-36 h-24 bg-slate-900/80 border border-slate-800 rounded shadow-md overflow-hidden pointer-events-none">
      <div className="w-full h-full border border-blue-500/20" />
    </div>
  );
}
