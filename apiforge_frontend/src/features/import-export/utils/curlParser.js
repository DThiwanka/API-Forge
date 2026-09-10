export function parseCurl(curlString) {
  const methodMatch = curlString.match(/-X\s+([A-Z]+)/i);
  const urlMatch = curlString.match(/(https?:\/\/[^\s"']+)/);

  return {
    method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
    url: urlMatch ? urlMatch[1] : '',
    headers: {},
    data: null,
  };
}

export default { parseCurl };
