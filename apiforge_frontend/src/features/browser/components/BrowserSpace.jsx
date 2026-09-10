import React from 'react';
import BrowserToolbar from './BrowserToolbar';
import BrowserAddressBar from './BrowserAddressBar';
import BrowserViewport from './BrowserViewport';
import NetworkActivity from './NetworkActivity';

export default function BrowserSpace() {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      <BrowserToolbar />
      <BrowserAddressBar />
      <div className="flex-1 flex overflow-hidden">
        <BrowserViewport />
        <NetworkActivity />
      </div>
    </div>
  );
}
