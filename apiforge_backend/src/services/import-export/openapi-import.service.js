export const openapiImportService = {
  async importSpec(spec) {
    const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
    return {
      name: parsed.info?.title || 'Imported OpenAPI Collection',
      paths: parsed.paths || {},
    };
  },
};

export default openapiImportService;
