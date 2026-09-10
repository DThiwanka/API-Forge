import { database } from '../config/database.js';

export const requestRepository = {
  async findAll(collectionId) {
    return database.client.request?.findMany({
      where: collectionId ? { collectionId } : undefined,
    });
  },

  async findById(id) {
    return database.client.request?.findUnique({ where: { id } });
  },

  async create(data) {
    return database.client.request?.create({ data });
  },

  async update(id, data) {
    return database.client.request?.update({ where: { id }, data });
  },

  async delete(id) {
    return database.client.request?.delete({ where: { id } });
  },
};

export default requestRepository;
