import { database } from '../config/database.js';

export const collectionRepository = {
  async findByWorkspace(workspaceId) {
    return database.client.collection?.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      include: { folders: true, requests: true },
    });
  },

  async findById(id) {
    return database.client.collection?.findUnique({
      where: { id },
      include: { folders: true, requests: true },
    });
  },

  async create(data) {
    return database.client.collection?.create({ data });
  },

  async update(id, data) {
    return database.client.collection?.update({ where: { id }, data });
  },

  async delete(id) {
    return database.client.collection?.delete({ where: { id } });
  },
};

export default collectionRepository;
