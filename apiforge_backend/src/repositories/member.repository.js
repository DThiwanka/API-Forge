import { database } from '../config/database.js';

export const memberRepository = {
  async findByWorkspace(workspaceId) {
    return database.client.workspaceMember?.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  },

  async delete(id) {
    return database.client.workspaceMember?.delete({ where: { id } });
  },
};

export default memberRepository;
