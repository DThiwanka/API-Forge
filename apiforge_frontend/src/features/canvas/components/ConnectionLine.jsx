import React from 'react';

export default function ConnectionLine({ from, to }) {
  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full">
      <line x1={from?.x || 0} y1={from?.y || 0} x2={to?.x || 0} y2={to?.y || 0} stroke="#3b82f6" strokeWidth="2" />
    </svg>
  );
}
