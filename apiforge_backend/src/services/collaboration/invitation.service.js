import crypto from 'node:crypto';
import { invitationRepository } from '../../repositories/invitation.repository.js';

export const invitationService = {
  async create({ workspaceId, email, role = 'MEMBER' }) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return invitationRepository.create({
      workspaceId,
      email,
      role,
      token,
      expiresAt,
    });
  },
};

export default invitationService;
