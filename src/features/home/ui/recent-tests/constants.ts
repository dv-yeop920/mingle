import type { MbtiType } from '@/shared/types/mbti';

type MockRecentTest = {
  id: string;
  groupName: string;
  groupType: string;
  memberCount: number;
  chemistryScore: number;
  date: string;
  representativeMbtis: MbtiType[];
};

const MOCK_RECENT_TESTS: MockRecentTest[] = [
  {
    id: '1',
    groupName: '절친 모임',
    groupType: '친구',
    memberCount: 4,
    chemistryScore: 78,
    date: '2024.03.15',
    representativeMbtis: ['ENFP', 'INTJ', 'ISFJ'],
  },
  {
    id: '2',
    groupName: '마케팅팀',
    groupType: '회사·팀',
    memberCount: 5,
    chemistryScore: 65,
    date: '2024.03.10',
    representativeMbtis: ['ENTJ', 'INFP', 'ESTJ'],
  },
];

export { MOCK_RECENT_TESTS };
