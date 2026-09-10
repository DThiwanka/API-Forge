export function parseResponse(rawResponse) {
  return {
    status: rawResponse?.status || 200,
    headers: rawResponse?.headers || {},
    data: rawResponse?.data || null,
  };
}

export default { parseResponse };
