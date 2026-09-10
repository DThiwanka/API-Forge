import React, { useState } from 'react';
import Tabs from '../../../components/ui/Tabs';
import ResponseBody from './ResponseBody';
import ResponseHeaders from './ResponseHeaders';
import ResponseCookies from './ResponseCookies';
import ResponseRaw from './ResponseRaw';

const TABS = [
  { id: 'body', label: 'Body' },
  { id: 'headers', label: 'Headers' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'raw', label: 'Raw' },
];

export default function ResponseTabs() {
  const [activeTab, setActiveTab] = useState('body');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} className="px-3" />
      <div className="flex-1 overflow-auto p-3">
        {activeTab === 'body' && <ResponseBody />}
        {activeTab === 'headers' && <ResponseHeaders />}
        {activeTab === 'cookies' && <ResponseCookies />}
        {activeTab === 'raw' && <ResponseRaw />}
      </div>
    </div>
  );
}
