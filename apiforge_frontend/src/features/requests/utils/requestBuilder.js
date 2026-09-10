export function buildRequestUrl(baseUrl, params = []) {
  if (!params.length) return baseUrl;
  const query = params
    .filter((p) => p.key && p.enabled !== false)
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`)
    .join('&');
  return query ? `${baseUrl}?${query}` : baseUrl;
}

export default { buildRequestUrl };
