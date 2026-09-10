import React, { useState } from 'react';
import Tabs from '../../../components/ui/Tabs';
import ParamsEditor from './ParamsEditor';
import HeadersEditor from './HeadersEditor';
import AuthEditor from './AuthEditor';
import BodyEditor from './BodyEditor';
import RequestSettings from './RequestSettings';

const TABS = [
  { id: 'params', label: 'Params' },
  { id: 'headers', label: 'Headers' },
  { id: 'auth', label: 'Auth' },
  { id: 'body', label: 'Body' },
  { id: 'settings', label: 'Settings' },
];

export default function RequestTabs() {
  const [activeTab, setActiveTab] = useState('params');

  return (
    <div className="flex flex-col border-b border-slate-800">
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} className="px-3" />
      <div className="p-3 max-h-56 overflow-auto">
        {activeTab === 'params' && <ParamsEditor />}
        {activeTab === 'headers' && <HeadersEditor />}
        {activeTab === 'auth' && <AuthEditor />}
        {activeTab === 'body' && <BodyEditor />}
        {activeTab === 'settings' && <RequestSettings />}
      </div>
    </div>
  );
}
