import { database } from '../config/database.js';

export const userRepository = {
  async findByEmail(email) {
    return database.client.user?.findUnique({ where: { email } });
  },

  async findById(id) {
    return database.client.user?.findUnique({ where: { id } });
  },

  async create(data) {
    return database.client.user?.create({ data });
  },
};

export default userRepository;
