import { database } from '../config/database.js';

export const environmentRepository = {
  async findByWorkspace(workspaceId) {
    return database.client.environment?.findMany({
      where: workspaceId ? { workspaceId } : undefined,
    });
  },

  async findById(id) {
    return database.client.environment?.findUnique({ where: { id } });
  },

  async create(data) {
    return database.client.environment?.create({ data });
  },

  async update(id, data) {
    return database.client.environment?.update({ where: { id }, data });
  },

  async delete(id) {
    return database.client.environment?.delete({ where: { id } });
  },
};

export default environmentRepository;
