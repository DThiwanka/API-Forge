import { database } from '../config/database.js';

export const folderRepository = {
  async findById(id) {
    return database.client.folder?.findUnique({ where: { id } });
  },

  async create(data) {
    return database.client.folder?.create({ data });
  },

  async update(id, data) {
    return database.client.folder?.update({ where: { id }, data });
  },

  async delete(id) {
    return database.client.folder?.delete({ where: { id } });
  },
};

export default folderRepository;
