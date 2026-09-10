import React from 'react';
import AssertionBuilder from './AssertionBuilder';
import TestResult from './TestResult';

export default function TestPanel() {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200">API Test Assertions</h3>
      <AssertionBuilder />
      <TestResult />
    </div>
  );
}
