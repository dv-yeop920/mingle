import type { Gender } from '@/shared/types/gender';
import type { MbtiType } from '@/shared/types/mbti';

import type { SelfMemberSeed } from './store';

type SelfMemberProfile = {
  nickname: string;
  mbti: MbtiType;
  gender: Gender;
};

const convertProfileToSelfMemberSeed = (
  profile: SelfMemberProfile,
): SelfMemberSeed => ({
  nickname: profile.nickname,
  mbti: profile.mbti,
  gender: profile.gender,
});

export { convertProfileToSelfMemberSeed, type SelfMemberProfile };
