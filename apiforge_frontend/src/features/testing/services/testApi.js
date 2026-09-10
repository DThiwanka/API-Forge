import { apiClient } from '../../../lib/apiClient';

export const testApi = {
  runTests: async (testConfig) => apiClient.post('/tests/run', testConfig),
};

export default testApi;
