import React from 'react';
import EmptyState from '../components/common/EmptyState';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <EmptyState
        title="404 - Page Not Found"
        description="The page you are looking for does not exist."
      />
    </div>
  );
}
