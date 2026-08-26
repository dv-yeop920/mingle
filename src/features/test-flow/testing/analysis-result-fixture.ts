import type { PersistedAnalysisResult } from '../model/schemas';

const ANALYSIS_DESCRIPTION =
  '민지와 하니는 서로의 속도를 살피면서 편안한 대화를 이어가요. 한 사람이 아이디어를 꺼내면 다른 사람이 기준을 정리해 균형을 만들어요. 선택지를 두세 개로 줄이면 더 즐겁게 결정할 수 있어요.';

const createAnalysisResultFixture = (): PersistedAnalysisResult => ({
  chemistryScore: 88,
  tagline: '다정하게 균형을 맞추는 모임',
  metrics: {
    conversation: 87,
    friendship: 89,
    teamwork: 85,
    atmosphere: 90,
    conflict: 82,
  },
  groupAtmosphere: {
    title: '편안한 대화가 이어지는 모임',
    description: ANALYSIS_DESCRIPTION,
  },
  decisionMaking: {
    title: '아이디어와 기준의 좋은 균형',
    description: ANALYSIS_DESCRIPTION,
  },
  cautionPoint: {
    title: '속도 차이를 살펴봐요',
    description:
      '서로 결정 속도가 달라 잠시 답답할 수 있어요. 선택지를 먼저 정리하고 생각할 시간을 나누면 더 편안하게 합의할 수 있어요.',
  },
  bestMoment: {
    title: '함께 계획을 완성하는 순간',
    description: ANALYSIS_DESCRIPTION,
  },
  memberRoles: [
    {
      memberId: 'member-1',
      nickname: '민지',
      mbti: 'ENFP',
      title: '분위기를 여는 아이디어 메이커',
      description:
        '민지는 먼저 이야기를 꺼내 모두가 참여할 틈을 만들어요. 자연스러운 반응으로 모임의 에너지를 따뜻하게 높여줘요.',
    },
    {
      memberId: 'member-2',
      nickname: '하니',
      mbti: 'ISTJ',
      title: '안정감을 더하는 정리 담당',
      description:
        '하니는 흩어진 이야기를 차분하게 정리해줘요. 모두가 놓친 부분을 챙겨 모임이 안정적으로 이어지게 해요.',
    },
  ],
  pairChemistry: [
    {
      pairId: 'member-1:member-2',
      memberAId: 'member-1',
      memberBId: 'member-2',
      memberANickname: '민지',
      memberBNickname: '하니',
      memberAMbti: 'ENFP',
      memberBMbti: 'ISTJ',
      score: 86,
      summary: '아이디어와 현실 감각이 자연스럽게 연결돼요.',
      description: ANALYSIS_DESCRIPTION,
      conversationScore: 84,
      conflictScore: 80,
      recommendedSituations: ['여행 계획', '함께하는 프로젝트'],
    },
  ],
  summary: '서로 다른 장점으로 편안하고 안정적인 분위기를 만들어요.',
  members: [
    {
      nickname: '민지',
      mbti: 'ENFP',
      gender: 'female',
      is_self: true,
    },
    {
      nickname: '하니',
      mbti: 'ISTJ',
      gender: 'female',
      is_self: false,
    },
  ],
  groupType: 'friends',
});

export { createAnalysisResultFixture };
