import { collectionRepository } from '../../repositories/collection.repository.js';

export const collectionService = {
  async getAll(workspaceId) {
    return collectionRepository.findByWorkspace(workspaceId);
  },

  async getById(id) {
    return collectionRepository.findById(id);
  },

  async create(data) {
    return collectionRepository.create(data);
  },

  async update(id, data) {
    return collectionRepository.update(id, data);
  },

  async delete(id) {
    return collectionRepository.delete(id);
  },
};

export default collectionService;
