import React from 'react';

export default function BrowserTabs({ tabs = [] }) {
  return (
    <div className="flex border-b border-slate-800 bg-slate-900">
      {tabs.map((tab) => (
        <div key={tab.id} className="px-3 py-1 text-xs border-r border-slate-800 text-slate-300">
          {tab.title}
        </div>
      ))}
    </div>
  );
}
