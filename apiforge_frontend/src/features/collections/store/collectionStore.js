const collectionStore = {
  collections: [],
  getCollections() {
    return this.collections;
  },
  setCollections(cols) {
    this.collections = cols;
  },
};

export default collectionStore;
