import React from 'react';
import TopBar from './TopBar';
import StatusBar from './StatusBar';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <TopBar />
      <main className="flex-1 flex overflow-hidden">{children}</main>
      <StatusBar />
    </div>
  );
}
