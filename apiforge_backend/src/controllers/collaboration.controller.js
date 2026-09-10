import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { invitationService } from '../services/collaboration/invitation.service.js';
import { memberService } from '../services/collaboration/member.service.js';

export const collaborationController = {
  invite: asyncHandler(async (req, res) => {
    const invitation = await invitationService.create(req.body, req.user.id);
    return ApiResponse.created(res, invitation, 'Invitation sent');
  }),

  getMembers: asyncHandler(async (req, res) => {
    const members = await memberService.getByWorkspace(req.params.workspaceId);
    return ApiResponse.success(res, members);
  }),

  removeMember: asyncHandler(async (req, res) => {
    await memberService.remove(req.params.memberId);
    return ApiResponse.success(res, null, 'Member removed');
  }),
};

export default collaborationController;
