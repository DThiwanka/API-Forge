import React from 'react';
import AssertionRow from './AssertionRow';
import Button from '../../../components/ui/Button';

export default function AssertionBuilder({ assertions = [] }) {
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {assertions.map((a, i) => (
          <AssertionRow key={i} assertion={a} />
        ))}
      </div>
      <Button variant="secondary" className="text-xs">+ Add Assertion</Button>
    </div>
  );
}
