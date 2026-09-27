import type { MbtiType, Temperament } from '@/shared/types/mbti';

const MBTI_TEMPERAMENTS: Record<MbtiType, Temperament> = {
  INTJ: 'analyst',
  INTP: 'analyst',
  ENTJ: 'analyst',
  ENTP: 'analyst',
  INFJ: 'diplomat',
  INFP: 'diplomat',
  ENFJ: 'diplomat',
  ENFP: 'diplomat',
  ISTJ: 'sentinel',
  ISFJ: 'sentinel',
  ESTJ: 'sentinel',
  ESFJ: 'sentinel',
  ISTP: 'explorer',
  ISFP: 'explorer',
  ESTP: 'explorer',
  ESFP: 'explorer',
};

const TEMPERAMENT_STYLES: Record<Temperament, { bg: string; fg: string; border: string }> = {
  analyst: { bg: 'bg-analyst-bg', fg: 'text-analyst-fg', border: 'border-analyst-border' },
  diplomat: { bg: 'bg-diplomat-bg', fg: 'text-diplomat-fg', border: 'border-diplomat-border' },
  sentinel: { bg: 'bg-sentinel-bg', fg: 'text-sentinel-fg', border: 'border-sentinel-border' },
  explorer: { bg: 'bg-explorer-bg', fg: 'text-explorer-fg', border: 'border-explorer-border' },
};

const getTemperament = (mbti: MbtiType): Temperament => MBTI_TEMPERAMENTS[mbti];

const getTemperamentStyles = (mbti: MbtiType) => TEMPERAMENT_STYLES[getTemperament(mbti)];

export { getTemperament, getTemperamentStyles, MBTI_TEMPERAMENTS, TEMPERAMENT_STYLES };
