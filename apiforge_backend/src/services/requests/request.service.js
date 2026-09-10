import { requestRepository } from '../../repositories/request.repository.js';

export const requestService = {
  async getAll(collectionId) {
    return requestRepository.findAll(collectionId);
  },

  async getById(id) {
    return requestRepository.findById(id);
  },

  async create(data, userId) {
    return requestRepository.create({ ...data, userId });
  },

  async update(id, data) {
    return requestRepository.update(id, data);
  },

  async delete(id) {
    return requestRepository.delete(id);
  },
};

export default requestService;
