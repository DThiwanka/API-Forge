import { useState } from 'react';
import environmentStore from '../store/environmentStore';

export function useEnvironment() {
  const [environment, setEnvironment] = useState(environmentStore.getActiveEnvironment());
  return { environment, setEnvironment };
}

export default useEnvironment;
