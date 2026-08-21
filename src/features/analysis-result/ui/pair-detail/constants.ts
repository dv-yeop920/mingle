import type { MbtiType } from '@/shared/types/mbti';

type MockPairMember = {
  nickname: string;
  mbti: MbtiType;
};

type MockPairDetail = {
  memberA: MockPairMember;
  memberB: MockPairMember;
  score: number;
  summary: string;
  description: string;
  conversationScore: number;
  conflictScore: number;
  recommendedSituations: string;
};

const MOCK_PAIR_DETAIL: MockPairDetail = {
  memberA: { nickname: '준', mbti: 'ENTP' },
  memberB: { nickname: '지연', mbti: 'ENFP' },
  score: 94,
  summary: '말이 끊이지 않는 조합',
  description:
    '새로운 주제를 던지는 사람과 그 이야기를 확장하는 사람이 만나서, 만나면 시간 개념이 사라지는 조합입니다. 다만 둘 다 마무리보다 시작을 좋아해서 계획이 흐지부지될 수 있어요.',
  conversationScore: 96,
  conflictScore: 28,
  recommendedSituations: '즉흥 여행, 밤 산책, 아이디어 회의',
};

export { MOCK_PAIR_DETAIL };
