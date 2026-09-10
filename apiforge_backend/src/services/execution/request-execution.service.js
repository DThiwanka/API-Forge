import { httpClientService } from './http-client.service.js';
import { ssrfProtectionService } from './ssrf-protection.service.js';
import { responseNormalizerService } from './response-normalizer.service.js';
import { historyRepository } from '../../repositories/history.repository.js';

export const requestExecutionService = {
  async execute(requestConfig, userId) {
    const { url, method = 'GET', headers = {}, body = null } = requestConfig;

    // SSRF Check
    ssrfProtectionService.validateUrl(url);

    const startTime = Date.now();
    const rawResponse = await httpClientService.send({ url, method, headers, body });
    const durationMs = Date.now() - startTime;

    const normalized = responseNormalizerService.normalize(rawResponse, durationMs);

    // Save history
    if (userId) {
      await historyRepository.create({
        userId,
        requestId: requestConfig.id,
        method,
        url,
        status: normalized.status,
        durationMs,
        sizeBytes: normalized.size,
      }).catch(() => {});
    }

    return normalized;
  },
};

export default requestExecutionService;
