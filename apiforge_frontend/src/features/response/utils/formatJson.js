export function formatJson(str) {
  try {
    const parsed = typeof str === 'string' ? JSON.parse(str) : str;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return str;
  }
}

export default { formatJson };
