import { describe, expect, it } from 'vitest';

import {
  normalizeAtmosphereSections,
  normalizeMemberRoles,
  normalizePairChemistry,
} from './normalize-analysis';

describe('result analysis normalizers', () => {
  it('OpenAI 분위기 응답의 제목과 설명을 모두 유지한다', () => {
    const sections = normalizeAtmosphereSections({
      groupAtmosphere: { title: '활기찬 모임', description: '전체 설명' },
      decisionMaking: { title: '함께 결정', description: '결정 설명' },
      cautionPoint: { title: '속도 차이', description: '주의 설명' },
      bestMoment: { title: '여행할 때', description: '강점 설명' },
    });

    expect(sections[0]).toMatchObject({
      title: '활기찬 모임',
      description: '전체 설명',
    });
    expect(sections[1]).toMatchObject({
      title: '함께 결정',
      description: '결정 설명',
    });
  });

  it('새 member role과 pair 응답 필드명을 UI 타입으로 변환한다', () => {
    const roles = normalizeMemberRoles([
      {
        memberId: 'member-1',
        nickname: '민지',
        mbti: 'ENFP',
        title: '아이디어 메이커',
        description: '새로운 가능성을 열어줍니다.',
      },
    ]);
    const pairs = normalizePairChemistry([
      {
        memberANickname: '민지',
        memberBNickname: '하니',
        memberAMbti: 'ENFP',
        memberBMbti: 'ISTJ',
        score: 81,
        summary: '상상력과 현실감',
        description: '서로의 빈틈을 채웁니다.',
        recommendedSituations: ['여행 계획', '프로젝트 실행'],
      },
    ], []);

    expect(roles[0].role).toBe('아이디어 메이커');
    expect(pairs[0].memberA.nickname).toBe('민지');
    expect(pairs[0].recommendedSituations).toBe('여행 계획, 프로젝트 실행');
  });
});
