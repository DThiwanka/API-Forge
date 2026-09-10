import React from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';

export default function AssertionRow({ assertion }) {
  return (
    <div className="flex gap-2 items-center">
      <Select className="w-36">
        <option value="status_eq">Status code equals</option>
        <option value="body_contains">Body contains</option>
        <option value="response_time">Response time &lt;</option>
      </Select>
      <Input placeholder="Expected value" defaultValue={assertion?.value} />
    </div>
  );
}
