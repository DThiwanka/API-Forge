import { database } from '../config/database.js';

export const historyRepository = {
  async findByUser(userId) {
    return database.client.history?.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async create(data) {
    return database.client.history?.create({ data });
  },

  async clearByUser(userId) {
    return database.client.history?.deleteMany({ where: { userId } });
  },

  async delete(id) {
    return database.client.history?.delete({ where: { id } });
  },
};

export default historyRepository;
