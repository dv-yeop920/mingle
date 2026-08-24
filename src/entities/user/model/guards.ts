import type { Gender } from '@/shared/types/gender';
import type { MbtiType } from '@/shared/types/mbti';

type ProfileCompletionTarget = {
  nickname: string;
  mbti: string | null;
  gender: string | null;
};

type CompleteProfile = ProfileCompletionTarget & {
  mbti: MbtiType;
  gender: Gender;
};

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

const GENDERS = ['male', 'female', 'other'] as const;

const isGender = (value: string | null): value is Gender => {
  return GENDERS.includes(value as Gender);
};

const isMbtiType = (value: string | null): value is MbtiType => {
  return MBTI_TYPES.includes(value as MbtiType);
};

const isProfileComplete = (
  profile: ProfileCompletionTarget | null,
): profile is CompleteProfile => {
  return Boolean(
    profile?.nickname.trim() &&
      isMbtiType(profile.mbti) &&
      isGender(profile.gender),
  );
};

export { isGender, isMbtiType, isProfileComplete, type CompleteProfile };
