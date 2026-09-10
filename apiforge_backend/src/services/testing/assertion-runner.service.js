import { assertionService } from './assertion.service.js';

export const assertionRunnerService = {
  runAll(assertions = [], response = {}) {
    return assertions.map((a) => ({
      ...a,
      passed: assertionService.check(a, response),
    }));
  },
};

export default assertionRunnerService;
