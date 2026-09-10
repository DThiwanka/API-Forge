import { testRepository } from '../../repositories/test.repository.js';
import { assertionRunnerService } from './assertion-runner.service.js';

export const testService = {
  async run({ request, response, assertions = [] }) {
    return assertionRunnerService.runAll(assertions, response);
  },

  async getByRequestId(requestId) {
    return testRepository.findByRequestId(requestId);
  },
};

export default testService;
