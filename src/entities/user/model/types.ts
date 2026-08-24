import type { Gender } from '@/shared/types/gender';

type Profile = {
  id: string;
  username: string;
  nickname: string;
  mbti: string | null;
  gender: Gender | null;
  createdAt: string;
  updatedAt: string;
};

export type { Profile };
