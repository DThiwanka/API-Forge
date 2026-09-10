export const testingValidator = {
  validate(body) {
    if (!body.assertions || !Array.isArray(body.assertions)) {
      return 'Assertions array is required';
    }
    return null;
  },
};

export default testingValidator;
