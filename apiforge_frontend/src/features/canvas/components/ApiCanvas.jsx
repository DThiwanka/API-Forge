import React from 'react';
import CanvasToolbar from './CanvasToolbar';
import CanvasControls from './CanvasControls';
import CanvasMiniMap from './CanvasMiniMap';

export default function ApiCanvas() {
  return (
    <div className="relative flex-1 bg-slate-950 overflow-hidden">
      <CanvasToolbar />
      <div className="w-full h-full flex items-center justify-center text-slate-600">
        Canvas Workspace Grid
      </div>
      <CanvasControls />
      <CanvasMiniMap />
    </div>
  );
}
