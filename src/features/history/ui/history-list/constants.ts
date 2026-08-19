import type { MbtiType } from '@/shared/types/mbti';

type MockHistoryItem = {
  id: string;
  groupName: string;
  groupType: string;
  memberCount: number;
  chemistryScore: number;
  date: string;
  representativeMbtis: MbtiType[];
};

const MOCK_HISTORY_ITEMS: MockHistoryItem[] = [
  { id: '1', groupName: '절친 모임', groupType: '친구', memberCount: 4, chemistryScore: 78, date: '2024.03.15', representativeMbtis: ['ENFP', 'INTJ', 'ISFJ'] },
  { id: '2', groupName: '마케팅팀', groupType: '회사·팀', memberCount: 5, chemistryScore: 65, date: '2024.03.10', representativeMbtis: ['ENTJ', 'INFP', 'ESTJ'] },
  { id: '3', groupName: '우리 가족', groupType: '가족', memberCount: 3, chemistryScore: 82, date: '2024.03.05', representativeMbtis: ['ISFJ', 'ENFJ', 'ESTP'] },
  { id: '4', groupName: '동아리', groupType: '친구', memberCount: 6, chemistryScore: 71, date: '2024.02.28', representativeMbtis: ['INTP', 'ESFP', 'ISTJ', 'ENFP'] },
];

export { MOCK_HISTORY_ITEMS };
