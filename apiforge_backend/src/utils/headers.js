export function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

export default normalizeHeaders;
