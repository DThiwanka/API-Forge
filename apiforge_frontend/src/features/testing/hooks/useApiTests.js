import { useState } from 'react';

export function useApiTests() {
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState(null);

  return { tests, setTests, results, setResults };
}

export default useApiTests;
