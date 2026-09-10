export const httpClientService = {
  async send({ url, method = 'GET', headers = {}, body = null, timeout = 30000 }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const options = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
        options.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
      }

      const response = await fetch(url, options);
      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      const responseHeaders = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data,
        size: Buffer.byteLength(text),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

export default httpClientService;
