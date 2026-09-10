import React from 'react';

export default function EmptyState({ title = 'No items found', description, action }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h4 className="text-base font-medium text-slate-300 mb-1">{title}</h4>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
