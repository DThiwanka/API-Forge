import React from 'react';

export default function ResponseCookies({ cookies = [] }) {
  return (
    <div className="text-xs text-slate-400">
      {cookies.length === 0 ? 'No cookies received' : JSON.stringify(cookies)}
    </div>
  );
}
