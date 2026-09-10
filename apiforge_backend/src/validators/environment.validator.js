export const environmentValidator = {
  validate(body) {
    if (!body.name) return 'Environment name is required';
    return null;
  },
};

export default environmentValidator;
