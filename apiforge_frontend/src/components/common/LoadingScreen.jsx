import React from 'react';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
