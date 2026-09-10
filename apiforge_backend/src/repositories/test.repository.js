import { database } from '../config/database.js';

export const testRepository = {
  async findByRequestId(requestId) {
    return database.client.test?.findMany({ where: { requestId } });
  },

  async create(data) {
    return database.client.test?.create({ data });
  },
};

export default testRepository;
