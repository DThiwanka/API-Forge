export const curlExportService = {
  toCurl(request) {
    const { method = 'GET', url = '', headers = {}, body = null } = request;
    let curl = `curl -X ${method} "${url}"`;

    for (const [k, v] of Object.entries(headers)) {
      curl += ` \
  -H "${k}: ${v}"`;
    }

    if (body) {
      const bodyStr = typeof body === 'object' ? JSON.stringify(body) : String(body);
      curl += ` \
  -d '${bodyStr}'`;
    }

    return curl;
  },
};

export default curlExportService;
