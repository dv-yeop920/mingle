import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_INSTRUCTIONS,
  buildAnalysisInput,
  buildExpectedPairs,
} from './prompt';

describe('analysis prompt builders', () => {
  const baseMembers = [
    {
      memberId: 'member-1',
      nickname: '민지',
      mbti: 'ENFP' as const,
      gender: 'female' as const,
      isSelf: true,
      order: 0,
    },
    {
      memberId: 'member-2',
      nickname: '하니',
      mbti: 'ISTJ' as const,
      gender: 'male' as const,
      isSelf: false,
      order: 1,
    },
  ];

  const createRequest = (groupType: 'friends' | 'company' | 'family') => ({
    schemaVersion: '2026-08-24' as const,
    group: {
      type: groupType,
      customName: null,
    },
    members: baseMembers,
    options: {
      locale: 'ko-KR' as const,
      tone: 'friendly' as const,
      includeAllPairs: true as const,
    },
  });

  it('정적 instructions에 단체별 기준과 conflict 의미가 포함되어 있다', () => {
    expect(ANALYSIS_INSTRUCTIONS).toContain('friends');
    expect(ANALYSIS_INSTRUCTIONS).toContain('company');
    expect(ANALYSIS_INSTRUCTIONS).toContain('family');
    expect(ANALYSIS_INSTRUCTIONS).toContain('갈등 관리/해소 케미');
    expect(ANALYSIS_INSTRUCTIONS).toContain('갈등 위험도가 아니다');
    expect(ANALYSIS_INSTRUCTIONS).toContain('Detailed Description Contract');
    expect(ANALYSIS_INSTRUCTIONS).toContain('100~260자');
    expect(ANALYSIS_INSTRUCTIONS).toContain('실제 nickname 또는 MBTI');
    expect(ANALYSIS_INSTRUCTIONS).toContain('다정하고 편안한 해요체');
    expect(ANALYSIS_INSTRUCTIONS).toContain('~이에요/~예요');
    expect(ANALYSIS_INSTRUCTIONS).toContain('~입니다');
    expect(ANALYSIS_INSTRUCTIONS).toContain('선택지를 두세 개로 줄이면');
  });

  it('회사/팀 분석 input을 구조화한다', () => {
    const input = buildAnalysisInput(createRequest('company'));

    expect(input.group.type).toBe('company');
    expect(input.group.label).toBe('회사/팀');
    expect(input.group.analysisFocus).toContain('업무 역할');
    expect(input.members).toHaveLength(2);
    expect(input.expectedPairs).toHaveLength(1);
  });

  it('모든 pair를 memberId 기반으로 생성한다', () => {
    const pairs = buildExpectedPairs([
      {
        memberId: 'a',
        nickname: '준',
        mbti: 'ENTP',
        gender: 'male',
        isSelf: true,
        order: 0,
      },
      {
        memberId: 'b',
        nickname: '지연',
        mbti: 'ENFP',
        gender: 'female',
        isSelf: false,
        order: 1,
      },
      {
        memberId: 'c',
        nickname: '민수',
        mbti: 'ISTJ',
        gender: 'male',
        isSelf: false,
        order: 2,
      },
    ]);

    expect(pairs.map((pair) => pair.pairId)).toEqual(['a:b', 'a:c', 'b:c']);
  });

  it('computedSignals를 계산한다', () => {
    const input = buildAnalysisInput(createRequest('friends'));

    expect(input.computedSignals.memberCount).toBe(2);
    expect(input.computedSignals.eCount).toBe(1);
    expect(input.computedSignals.iCount).toBe(1);
    expect(input.computedSignals.fCount).toBe(1);
    expect(input.computedSignals.tCount).toBe(1);
    expect(input.computedSignals.temperamentCounts.diplomat).toBe(1);
    expect(input.computedSignals.temperamentCounts.sentinel).toBe(1);
  });
});
