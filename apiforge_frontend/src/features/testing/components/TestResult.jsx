import React from 'react';
import Badge from '../../../components/ui/Badge';

export default function TestResult({ passed = true, message = 'All assertions passed' }) {
  return (
    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
      <Badge variant={passed ? 'success' : 'danger'}>{passed ? 'PASS' : 'FAIL'}</Badge>
      <span className="text-xs text-slate-300">{message}</span>
    </div>
  );
}
