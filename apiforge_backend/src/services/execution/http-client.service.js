import { performance } from 'node:perf_hooks';
import { validateTargetUrl } from './ssrf-protection.service.js';
import { normalizeResponse } from './response-normalizer.service.js';
import { AppError } from '../../utils/appError.js';
import env from '../../config/env.js';

const MAX_REDIRECTS = 5;

/**
 * Perform a bounded, SSRF-safe HTTP request using native fetch
 * 
 * @param {object} params
 * @param {string} params.method - HTTP method (GET, POST, etc.)
 * @param {string} params.url - Target URL
 * @param {Record<string, string>} [params.headers={}] - HTTP headers
 * @param {string|Buffer|undefined} [params.body] - Request body
 * @param {number} [params.timeoutMs] - Request timeout in ms
 * @param {number} [params.maxSizeBytes] - Max allowable response size in bytes
 * @param {boolean} [params.followRedirects=true] - Whether to follow 3xx redirects
 * @param {boolean} [params.allowLocalTargets=false] - Testing override for local targets
 * @returns {Promise<object>} Normalized response
 */
export async function sendRequest({
  method = 'GET',
  url,
  headers = {},
  body,
  timeoutMs = env.REQUEST_TIMEOUT_MS,
  maxSizeBytes = env.MAX_RESPONSE_SIZE_BYTES,
  followRedirects = true,
  allowLocalTargets = false,
}) {
  const startTime = performance.now();
  const controller = new AbortController();
  let timedOut = false;

  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    controller.abort('TIMEOUT');
  }, timeoutMs);

  let currentUrl = url;
  let currentMethod = method.toUpperCase();
  let currentHeaders = { ...headers };
  let currentBody = body;
  let redirectCount = 0;
  let redirected = false;

  try {
    while (true) {
      // 1. Re-validate destination URL against SSRF rules before EVERY hop
      await validateTargetUrl(currentUrl, { allowLocalTargets });

      const requestOptions = {
        method: currentMethod,
        headers: currentHeaders,
        redirect: 'manual', // Never let native fetch follow blindly
        signal: controller.signal,
      };

      if (currentMethod !== 'GET' && currentMethod !== 'HEAD' && currentBody !== undefined) {
        requestOptions.body = currentBody;
      }

      let response;
      try {
        response = await fetch(currentUrl, requestOptions);
      } catch (fetchErr) {
        if (timedOut || controller.signal.aborted) {
          throw new AppError(`Request timed out after ${timeoutMs}ms`, 504);
        }
        const errorDetail = fetchErr.cause?.message || fetchErr.message;
        throw new AppError(`Failed to connect to '${currentUrl}': ${errorDetail}`, 502);
      }

      // 2. Check for redirect
      const isRedirect = [301, 302, 303, 307, 308].includes(response.status);

      if (isRedirect && followRedirects) {
        const location = response.headers.get('location');
        if (location) {
          redirectCount++;
          if (redirectCount > MAX_REDIRECTS) {
            throw new AppError(`Exceeded maximum limit of ${MAX_REDIRECTS} redirects`, 508);
          }

          redirected = true;
          const nextUrl = new URL(location, currentUrl).toString();

          // Handle method mutation on redirect according to HTTP specifications
          if ([301, 302, 303].includes(response.status)) {
            if (currentMethod === 'POST' || response.status === 303) {
              currentMethod = 'GET';
              currentBody = undefined;
              delete currentHeaders['content-type'];
              delete currentHeaders['Content-Type'];
              delete currentHeaders['content-length'];
              delete currentHeaders['Content-Length'];
            }
          }

          currentUrl = nextUrl;
          continue; // Execute next hop
        }
      }

      // 3. Read response body with streaming size enforcement
      let bodyBuffer;
      if (response.body && currentMethod !== 'HEAD') {
        const reader = response.body.getReader();
        const chunks = [];
        let bytesReceived = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            bytesReceived += value.length;
            if (bytesReceived > maxSizeBytes) {
              controller.abort('SIZE_EXCEEDED');
              throw new AppError(
                `Response payload size exceeded maximum allowed limit of ${maxSizeBytes} bytes`,
                413
              );
            }
            chunks.push(value);
          }
          bodyBuffer = Buffer.concat(chunks);
        } catch (streamErr) {
          if (streamErr instanceof AppError) throw streamErr;
          if (timedOut || controller.signal.aborted) {
            throw new AppError(`Request timed out after ${timeoutMs}ms`, 504);
          }
          throw new AppError(`Error reading response body: ${streamErr.message}`, 502);
        }
      } else {
        bodyBuffer = Buffer.alloc(0);
      }

      const totalDuration = performance.now() - startTime;

      // 4. Return normalized response payload
      return normalizeResponse({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        bodyBuffer,
        timeMs: totalDuration,
        url: currentUrl,
        redirected,
      });
    }
  } finally {
    clearTimeout(timeoutTimer);
  }
}

export default {
  sendRequest,
};

