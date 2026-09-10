import { useState } from 'react';
import collectionStore from '../store/collectionStore';

export function useCollections() {
  const [collections, setCollections] = useState(collectionStore.getCollections());
  return { collections, setCollections };
}

export default useCollections;
