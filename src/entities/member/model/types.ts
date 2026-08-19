import type { MbtiType } from '@/shared/types/mbti';

type Gender = 'male' | 'female' | 'other';

type Member = {
  id: string;
  groupId: string;
  nickname: string;
  gender: Gender;
  mbti: MbtiType;
  isSelf: boolean;
  order: number;
};

export type { Gender, Member };
