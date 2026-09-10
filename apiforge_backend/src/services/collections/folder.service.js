import { folderRepository } from '../../repositories/folder.repository.js';

export const folderService = {
  async create(data) {
    return folderRepository.create(data);
  },

  async getById(id) {
    return folderRepository.findById(id);
  },

  async update(id, data) {
    return folderRepository.update(id, data);
  },

  async delete(id) {
    return folderRepository.delete(id);
  },
};

export default folderService;
