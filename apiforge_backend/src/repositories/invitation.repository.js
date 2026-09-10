import { database } from '../config/database.js';

export const invitationRepository = {
  async create(data) {
    return database.client.invitation?.create({ data });
  },

  async findByToken(token) {
    return database.client.invitation?.findUnique({ where: { token } });
  },
};

export default invitationRepository;
