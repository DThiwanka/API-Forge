import { historyRepository } from '../../repositories/history.repository.js';

export const historyService = {
  async getAll(userId) {
    return historyRepository.findByUser(userId);
  },

  async clear(userId) {
    return historyRepository.clearByUser(userId);
  },

  async delete(id) {
    return historyRepository.delete(id);
  },
};

export default historyService;
