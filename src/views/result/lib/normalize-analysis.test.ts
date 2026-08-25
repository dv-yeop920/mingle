import { describe, expect, it } from 'vitest';

import {
  normalizeAtmosphereSections,
  normalizeMemberRoles,
  normalizeMetrics,
  normalizePairChemistry,
} from './normalize-analysis';

describe('result analysis normalizers', () => {
  it('유효한 점수만 복원하고 손상된 metrics 값은 제외한다', () => {
    expect(
      normalizeMetrics({
        conversation: 82,
        teamwork: '높음',
        conflict: Number.NaN,
        atmosphere: 101,
      }),
    ).toEqual({ conversation: 82 });
    expect(normalizeMetrics(null)).toEqual({});
  });

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

  it('기존 DB의 문자열 분위기 필드를 설명으로 복원한다', () => {
    const sections = normalizeAtmosphereSections({
      groupAtmosphere: {
        description: '대화가 자연스럽게 이어지는 편이에요.',
        decision_making: '충분히 이야기한 다음 함께 결정해요.',
        conflict: '결정 속도의 차이를 배려하면 좋아요.',
        best_moment: '새로운 경험을 함께할 때 가장 빛나요.',
      },
    });

    expect(sections).toMatchObject([
      {
        title: '우리 모임 특징',
        description: '대화가 자연스럽게 이어지는 편이에요.',
      },
      {
        title: '의사결정 방식',
        description: '충분히 이야기한 다음 함께 결정해요.',
      },
      {
        title: '주의 포인트',
        description: '결정 속도의 차이를 배려하면 좋아요.',
      },
      {
        title: 'BEST MOMENT',
        description: '새로운 경험을 함께할 때 가장 빛나요.',
      },
    ]);
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

  it('기존 DB의 pair snake_case 필드와 detail을 복원한다', () => {
    const pairs = normalizePairChemistry(
      [
        {
          member_a: '민지',
          member_b: '하니',
          score: 76,
          summary: '서로를 보완해요',
          detail: '관점의 차이가 오히려 균형을 만들어 줘요.',
        },
      ],
      [
        { nickname: '민지', mbti: 'ENFP' },
        { nickname: '하니', mbti: 'ISTJ' },
      ],
    );

    expect(pairs[0]).toMatchObject({
      memberA: { nickname: '민지', mbti: 'ENFP' },
      memberB: { nickname: '하니', mbti: 'ISTJ' },
      description: '관점의 차이가 오히려 균형을 만들어 줘요.',
    });
  });
});
