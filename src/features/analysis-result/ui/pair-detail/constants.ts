import type { MbtiType } from '@/shared/types/mbti';

type MockPairMember = {
  nickname: string;
  mbti: MbtiType;
};

type MockPairDetail = {
  memberA: MockPairMember;
  memberB: MockPairMember;
  score: number;
  strengths: string[];
  cautions: string[];
  tip: string;
};

const MOCK_PAIR_DETAIL: MockPairDetail = {
  memberA: { nickname: '민지', mbti: 'ENFP' },
  memberB: { nickname: '수현', mbti: 'INTJ' },
  score: 88,
  strengths: [
    'ENFP의 창의성과 INTJ의 분석력이 시너지를 냄',
    '서로 부족한 부분을 자연스럽게 보완',
    '깊이 있는 대화를 통해 유대감 형성',
  ],
  cautions: [
    '계획 vs 즉흥 — 일정 조율 시 갈등 가능',
    '감정 표현 방식이 달라 오해가 생길 수 있음',
  ],
  tip: '중요한 결정은 INTJ가, 팀 사기는 ENFP가 담당하면 최적의 파트너십을 발휘합니다.',
};

export { MOCK_PAIR_DETAIL };
