import { workspaceRepository } from '../../repositories/workspace.repository.js';

export const workspaceService = {
  async getAll(userId) {
    return workspaceRepository.findAllByUser(userId);
  },

  async getById(id, userId) {
    return workspaceRepository.findById(id);
  },

  async create(data, userId) {
    return workspaceRepository.create(data, userId);
  },

  async update(id, data) {
    return workspaceRepository.update(id, data);
  },

  async delete(id) {
    return workspaceRepository.delete(id);
  },
};

export default workspaceService;
