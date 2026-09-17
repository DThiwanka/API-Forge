import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMembers,
  getInvitations,
  createInvitation,
  revokeInvitation,
  updateMemberRole,
  removeMember,
  validateInvitation,
  acceptInvitation,
} from '../services/collaborationApi';
import { toast } from '../../../stores/toastStore';

/**
 * Hook to query members of a workspace
 */
export function useMembersQuery(workspaceId) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => getMembers(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}

/**
 * Hook to query invitations of a workspace (Admin/Owner)
 */
export function useInvitationsQuery(workspaceId, enabled = true) {
  return useQuery({
    queryKey: ['workspace-invitations', workspaceId],
    queryFn: () => getInvitations(workspaceId),
    enabled: Boolean(workspaceId) && enabled,
    staleTime: 15000,
  });
}

/**
 * Hook to invite a new member
 */
export function useInviteMemberMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createInvitation(workspaceId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] });
      toast.success(`Invitation sent to ${data.invitation.email}`);
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Failed to send invitation';
      toast.error(message);
    },
  });
}

/**
 * Hook to revoke an invitation
 */
export function useRevokeInvitationMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId) => revokeInvitation(workspaceId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] });
      toast.success('Invitation revoked');
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Failed to revoke invitation';
      toast.error(message);
    },
  });
}

/**
 * Hook to update a member's role
 */
export function useUpdateMemberRoleMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role }) => updateMemberRole(workspaceId, memberId, role),
    onSuccess: (updatedMember) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast.success(`Updated role for ${updatedMember.name || updatedMember.email} to ${updatedMember.role}`);
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Failed to update member role';
      toast.error(message);
    },
  });
}

/**
 * Hook to remove a member
 */
export function useRemoveMemberMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId) => removeMember(workspaceId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast.success('Member removed from workspace');
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Failed to remove member';
      toast.error(message);
    },
  });
}

/**
 * Hook to validate an invitation token
 */
export function useValidateInvitationQuery(token) {
  return useQuery({
    queryKey: ['invitation-validate', token],
    queryFn: () => validateInvitation(token),
    enabled: Boolean(token),
    retry: false,
  });
}

/**
 * Hook to accept an invitation token
 */
export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token) => acceptInvitation(token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success(`Joined ${data.workspaceName} successfully!`);
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Failed to accept invitation';
      toast.error(message);
    },
  });
}

export default {
  useMembersQuery,
  useInvitationsQuery,
  useInviteMemberMutation,
  useRevokeInvitationMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useValidateInvitationQuery,
  useAcceptInvitationMutation,
};

