import React from 'react';
import TopBar from './TopBar';
import StatusBar from './StatusBar';

export default function AppShell({ children }) {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#090a0f] text-[#f0f2f5] overflow-hidden">
      <TopBar />
      <main className="flex-1 flex overflow-hidden relative">
        {children}
      </main>
      <StatusBar />
    </div>
  );
}
