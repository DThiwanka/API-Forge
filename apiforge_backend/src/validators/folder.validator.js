export const folderValidator = {
  validate(body) {
    if (!body.name || !body.name.trim()) return 'Folder name is required';
    if (!body.collectionId) return 'Collection ID is required';
    return null;
  },
};

export default folderValidator;
