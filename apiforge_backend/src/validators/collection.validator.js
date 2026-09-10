export const collectionValidator = {
  validate(body) {
    if (!body.name || !body.name.trim()) return 'Collection name is required';
    return null;
  },
};

export default collectionValidator;
