import React from 'react';
import RequestMethodSelector from './RequestMethodSelector';
import RequestUrlInput from './RequestUrlInput';
import RequestSendButton from './RequestSendButton';
import RequestSaveButton from './RequestSaveButton';

export default function RequestHeader() {
  return (
    <div className="p-3 border-b border-slate-800 flex items-center gap-2">
      <RequestMethodSelector />
      <RequestUrlInput />
      <RequestSendButton />
      <RequestSaveButton />
    </div>
  );
}
