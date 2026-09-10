import { collectionRepository } from '../../repositories/collection.repository.js';

export const collectionExportService = {
  async exportCollection(collectionId) {
    const collection = await collectionRepository.findById(collectionId);
    return {
      info: {
        name: collection?.name || 'Collection Export',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: collection?.requests || [],
    };
  },
};

export default collectionExportService;
