import React from 'react';
import CollectionItem from './CollectionItem';

export default function CollectionTree({ collections = [] }) {
  return (
    <div className="p-2 space-y-1">
      {collections.map((col) => (
        <CollectionItem key={col.id} collection={col} />
      ))}
    </div>
  );
}
