import type { MbtiType } from '@/shared/types/mbti';

import type { Gender } from '@/entities/member';

type EditableMemberCardProps = {
  id: string;
  nickname: string;
  mbti: MbtiType;
  gender: Gender;
  isSelf: boolean;
  role: string | null;
  onNicknameChange: (id: string, value: string) => void;
  onRoleChange: (id: string, value: string) => void;
  onMbtiSelect: (id: string) => void;
  onGenderChange: (id: string, gender: Gender) => void;
  onDelete: (id: string) => void;
  nicknameError?: string;
  rolePlaceholder?: string;
  className?: string;
};

export type { EditableMemberCardProps };
