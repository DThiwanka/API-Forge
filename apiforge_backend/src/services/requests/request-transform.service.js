export const requestTransformService = {
  transformHeaders(headers = []) {
    const result = {};
    for (const h of headers) {
      if (h.key && h.enabled !== false) {
        result[h.key] = h.value;
      }
    }
    return result;
  },

  transformQueryParams(params = []) {
    return params
      .filter((p) => p.key && p.enabled !== false)
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`)
      .join('&');
  },
};

export default requestTransformService;
