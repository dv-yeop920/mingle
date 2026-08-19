import type { MbtiType } from '@/shared/types/mbti';

import type { Gender } from '@/entities/member';

type MockMember = {
  id: string;
  nickname: string;
  mbti: MbtiType;
  gender: Gender;
  isSelf: boolean;
};

const MOCK_SELF: MockMember = {
  id: '1',
  nickname: '민지',
  mbti: 'ENFP',
  gender: 'female',
  isSelf: true,
};

const MOCK_NEW_MEMBER: MockMember = {
  id: '',
  nickname: '새 멤버',
  mbti: 'ISTJ',
  gender: 'male',
  isSelf: false,
};

export { MOCK_NEW_MEMBER, MOCK_SELF };
export type { MockMember };
