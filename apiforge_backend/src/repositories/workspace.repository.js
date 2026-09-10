import { database } from '../config/database.js';

export const workspaceRepository = {
  async findAllByUser(userId) {
    return database.client.workspace?.findMany({
      where: { members: { some: { userId } } },
    });
  },

  async findById(id) {
    return database.client.workspace?.findUnique({
      where: { id },
      include: { collections: true, environments: true, members: true },
    });
  },

  async create(data, userId) {
    return database.client.workspace?.create({
      data: {
        name: data.name,
        members: { create: { userId, role: 'OWNER' } },
      },
    });
  },

  async update(id, data) {
    return database.client.workspace?.update({ where: { id }, data });
  },

  async delete(id) {
    return database.client.workspace?.delete({ where: { id } });
  },
};

export default workspaceRepository;
