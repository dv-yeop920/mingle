import { describe, expect, it } from 'vitest';

import type { MbtiType } from '@/shared/types/mbti';

import { getTemperament, getTemperamentStyles, MBTI_TEMPERAMENTS, TEMPERAMENT_STYLES } from './mbti';

describe('getTemperament', () => {
  it('분석가(analyst) 유형을 올바르게 반환한다', () => {
    const analysts: MbtiType[] = ['INTJ', 'INTP', 'ENTJ', 'ENTP'];
    analysts.forEach((mbti) => {
      expect(getTemperament(mbti)).toBe('analyst');
    });
  });

  it('외교관(diplomat) 유형을 올바르게 반환한다', () => {
    const diplomats: MbtiType[] = ['INFJ', 'INFP', 'ENFJ', 'ENFP'];
    diplomats.forEach((mbti) => {
      expect(getTemperament(mbti)).toBe('diplomat');
    });
  });

  it('관리자(sentinel) 유형을 올바르게 반환한다', () => {
    const sentinels: MbtiType[] = ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'];
    sentinels.forEach((mbti) => {
      expect(getTemperament(mbti)).toBe('sentinel');
    });
  });

  it('탐험가(explorer) 유형을 올바르게 반환한다', () => {
    const explorers: MbtiType[] = ['ISTP', 'ISFP', 'ESTP', 'ESFP'];
    explorers.forEach((mbti) => {
      expect(getTemperament(mbti)).toBe('explorer');
    });
  });

  it('16가지 MBTI 유형이 모두 매핑되어 있다', () => {
    expect(Object.keys(MBTI_TEMPERAMENTS)).toHaveLength(16);
  });
});

describe('getTemperamentStyles', () => {
  it('각 기질에 맞는 스타일을 반환한다', () => {
    const style = getTemperamentStyles('ENFP');
    expect(style).toEqual(TEMPERAMENT_STYLES.diplomat);
    expect(style).toHaveProperty('bg');
    expect(style).toHaveProperty('fg');
    expect(style).toHaveProperty('border');
  });

  it('4가지 기질의 스타일이 모두 정의되어 있다', () => {
    expect(Object.keys(TEMPERAMENT_STYLES)).toHaveLength(4);
    expect(TEMPERAMENT_STYLES).toHaveProperty('analyst');
    expect(TEMPERAMENT_STYLES).toHaveProperty('diplomat');
    expect(TEMPERAMENT_STYLES).toHaveProperty('sentinel');
    expect(TEMPERAMENT_STYLES).toHaveProperty('explorer');
  });

  it('같은 기질의 MBTI는 같은 스타일을 반환한다', () => {
    expect(getTemperamentStyles('INTJ')).toEqual(getTemperamentStyles('ENTP'));
    expect(getTemperamentStyles('INFJ')).toEqual(getTemperamentStyles('ENFP'));
    expect(getTemperamentStyles('ISTJ')).toEqual(getTemperamentStyles('ESFJ'));
    expect(getTemperamentStyles('ISTP')).toEqual(getTemperamentStyles('ESFP'));
  });

  it('다른 기질의 MBTI는 다른 스타일을 반환한다', () => {
    expect(getTemperamentStyles('INTJ')).not.toEqual(getTemperamentStyles('INFJ'));
    expect(getTemperamentStyles('ISTJ')).not.toEqual(getTemperamentStyles('ISTP'));
  });
});
