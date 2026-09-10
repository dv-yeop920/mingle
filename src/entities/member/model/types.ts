import type { Gender } from '@/shared/types/gender';
import type { MbtiType } from '@/shared/types/mbti';

type Member = {
  id: string;
  groupId: string;
  nickname: string;
  gender: Gender;
  mbti: MbtiType;
  isSelf: boolean;
  order: number;
  role: string | null;
};

export type { Gender, Member };
