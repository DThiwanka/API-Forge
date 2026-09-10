export const requestValidator = {
  validate(body) {
    if (!body.url) return 'URL is required';
    if (!body.method) return 'HTTP method is required';
    return null;
  },
};

export default requestValidator;
