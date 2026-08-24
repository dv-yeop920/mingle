import type { MbtiType, Temperament } from '@/shared/types/mbti';

type MbtiGroup = {
  label: string;
  temperament: Temperament;
  types: MbtiType[];
};

const MBTI_GROUPS: MbtiGroup[] = [
  { label: '분석가', temperament: 'analyst', types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
  { label: '외교관', temperament: 'diplomat', types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
  { label: '관리자', temperament: 'sentinel', types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
  { label: '탐험가', temperament: 'explorer', types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
];

export { MBTI_GROUPS, type MbtiGroup };
