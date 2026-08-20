import { describe, expect, it } from 'vitest';

import { buildAnalysisPrompt } from './prompt';

describe('buildAnalysisPrompt', () => {
  const baseMembers = [
    { nickname: '민지', mbti: 'ENFP', gender: 'female', isSelf: true },
    { nickname: '하니', mbti: 'ISTJ', gender: 'male', isSelf: false },
  ];

  it('친구 그룹 프롬프트를 생성한다', () => {
    const { systemPrompt, userPrompt } = buildAnalysisPrompt({
      groupType: 'friends',
      members: baseMembers,
    });

    expect(systemPrompt).toContain('MBTI 기반 그룹 케미 분석 전문가');
    expect(systemPrompt).toContain('JSON 형식');
    expect(userPrompt).toContain('친구');
    expect(userPrompt).toContain('2명');
  });

  it('회사 그룹 프롬프트를 생성한다', () => {
    const { userPrompt } = buildAnalysisPrompt({
      groupType: 'work',
      members: baseMembers,
    });

    expect(userPrompt).toContain('회사·팀');
  });

  it('가족 그룹 프롬프트를 생성한다', () => {
    const { userPrompt } = buildAnalysisPrompt({
      groupType: 'family',
      members: baseMembers,
    });

    expect(userPrompt).toContain('가족');
  });

  it('커스텀 그룹은 customName을 사용한다', () => {
    const { userPrompt } = buildAnalysisPrompt({
      groupType: 'custom',
      customName: '우리 동아리',
      members: baseMembers,
    });

    expect(userPrompt).toContain('우리 동아리');
    expect(userPrompt).not.toContain('기타');
  });

  it('커스텀 그룹에 customName이 없으면 기타를 사용한다', () => {
    const { userPrompt } = buildAnalysisPrompt({
      groupType: 'custom',
      members: baseMembers,
    });

    expect(userPrompt).toContain('기타');
  });

  it('멤버 정보를 올바르게 포맷한다', () => {
    const { userPrompt } = buildAnalysisPrompt({
      groupType: 'friends',
      members: baseMembers,
    });

    expect(userPrompt).toContain('1. 민지 (ENFP, 여성, 본인)');
    expect(userPrompt).toContain('2. 하니 (ISTJ, 남성)');
  });

  it('성별이 other인 멤버를 기타로 표시한다', () => {
    const { userPrompt } = buildAnalysisPrompt({
      groupType: 'friends',
      members: [
        { nickname: '알렉스', mbti: 'ENTP', gender: 'other', isSelf: false },
      ],
    });

    expect(userPrompt).toContain('1. 알렉스 (ENTP, 기타)');
  });

  it('멤버 수를 정확히 표시한다', () => {
    const threeMembers = [
      ...baseMembers,
      { nickname: '다니엘', mbti: 'INFJ', gender: 'male', isSelf: false },
    ];
    const { userPrompt } = buildAnalysisPrompt({
      groupType: 'friends',
      members: threeMembers,
    });

    expect(userPrompt).toContain('3명');
  });

  it('시스템 프롬프트에 응답 JSON 구조가 포함되어 있다', () => {
    const { systemPrompt } = buildAnalysisPrompt({
      groupType: 'friends',
      members: baseMembers,
    });

    expect(systemPrompt).toContain('chemistryScore');
    expect(systemPrompt).toContain('metrics');
    expect(systemPrompt).toContain('groupAtmosphere');
    expect(systemPrompt).toContain('memberRoles');
    expect(systemPrompt).toContain('pairChemistry');
    expect(systemPrompt).toContain('summary');
  });
});
