import type { MbtiType } from '@/shared/types/mbti';

import type { Gender } from '../../model/types';

type MemberCardProps = {
  nickname: string;
  mbti: MbtiType;
  gender: Gender;
  isSelf?: boolean;
  onMore?: () => void;
  className?: string;
};

export type { MemberCardProps };
