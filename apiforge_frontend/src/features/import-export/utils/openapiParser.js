export function parseOpenApi(spec) {
  try {
    const data = typeof spec === 'string' ? JSON.parse(spec) : spec;
    return {
      title: data.info?.title || 'OpenAPI Import',
      paths: data.paths || {},
    };
  } catch {
    return null;
  }
}

export default { parseOpenApi };
