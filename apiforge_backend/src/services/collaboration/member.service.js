import { memberRepository } from '../../repositories/member.repository.js';

export const memberService = {
  async getByWorkspace(workspaceId) {
    return memberRepository.findByWorkspace(workspaceId);
  },

  async remove(memberId) {
    return memberRepository.delete(memberId);
  },
};

export default memberService;
