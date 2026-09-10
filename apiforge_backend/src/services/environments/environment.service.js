import { environmentRepository } from '../../repositories/environment.repository.js';

export const environmentService = {
  async getAll(workspaceId) {
    return environmentRepository.findByWorkspace(workspaceId);
  },

  async getById(id) {
    return environmentRepository.findById(id);
  },

  async create(data) {
    return environmentRepository.create(data);
  },

  async update(id, data) {
    return environmentRepository.update(id, data);
  },

  async delete(id) {
    return environmentRepository.delete(id);
  },
};

export default environmentService;
