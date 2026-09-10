export const importValidator = {
  validateCurl(body) {
    if (!body.command) return 'cURL command is required';
    return null;
  },
  validateOpenApi(body) {
    if (!body.spec) return 'OpenAPI specification is required';
    return null;
  },
};

export default importValidator;
