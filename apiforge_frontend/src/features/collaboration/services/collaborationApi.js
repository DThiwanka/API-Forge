import apiClient from '../../../lib/apiClient';

/**
 * List all members of a workspace
 * @param {string} workspaceId
 * @returns {Promise<Array<object>>}
 */
export async function getMembers(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/members`);
  return response.data.data.members;
}

/**
 * List all invitations for a workspace
 * @param {string} workspaceId
 * @returns {Promise<Array<object>>}
 */
export async function getInvitations(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/invitations`);
  return response.data.data.invitations;
}

/**
 * Create a new workspace invitation
 * @param {string} workspaceId
 * @param {object} payload - { email, role }
 * @returns {Promise<object>}
 */
export async function createInvitation(workspaceId, payload) {
  const response = await apiClient.post(`/workspaces/${workspaceId}/invitations`, payload);
  return response.data.data;
}

/**
 * Revoke an active invitation
 * @param {string} workspaceId
 * @param {string} invitationId
 * @returns {Promise<object>}
 */
export async function revokeInvitation(workspaceId, invitationId) {
  const response = await apiClient.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`);
  return response.data.data.invitation;
}

/**
 * Update a member's role
 * @param {string} workspaceId
 * @param {string} memberId
 * @param {string} role
 * @returns {Promise<object>}
 */
export async function updateMemberRole(workspaceId, memberId, role) {
  const response = await apiClient.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role });
  return response.data.data.member;
}

/**
 * Remove a member from a workspace
 * @param {string} workspaceId
 * @param {string} memberId
 * @returns {Promise<object>}
 */
export async function removeMember(workspaceId, memberId) {
  const response = await apiClient.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  return response.data.data;
}

/**
 * Validate an invitation token (Public)
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function validateInvitation(token) {
  const response = await apiClient.get(`/invitations/${token}/validate`);
  return response.data.data.invitation;
}

/**
 * Accept an invitation token (Authenticated)
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function acceptInvitation(token) {
  const response = await apiClient.post(`/invitations/${token}/accept`);
  return response.data.data;
}

export default {
  getMembers,
  getInvitations,
  createInvitation,
  revokeInvitation,
  updateMemberRole,
  removeMember,
  validateInvitation,
  acceptInvitation,
};

