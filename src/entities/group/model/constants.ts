import type { GroupType } from './types';

type GroupTypeOption = {
  type: GroupType;
  icon: string;
  title: string;
  description: string;
  iconBg: string;
  isDashed?: boolean;
};

const GROUP_TYPE_OPTIONS: GroupTypeOption[] = [
  { type: 'friends', icon: '🧑‍🤝‍🧑', title: '친구', description: '친밀도, 대화, 갈등, 분위기를 분석해요', iconBg: 'bg-primary-tonal' },
  { type: 'work', icon: '💼', title: '회사 / 팀', description: '업무, 의사결정, 커뮤니케이션, 리더 역할', iconBg: 'bg-sentinel-bg' },
  { type: 'family', icon: '🏠', title: '가족', description: '성향 차이, 대화 방식, 관계를 분석해요', iconBg: 'bg-explorer-bg' },
  { type: 'custom', icon: '✏️', title: '기타', description: '그룹 이름을 직접 입력해요', iconBg: 'bg-insight-surface', isDashed: true },
];

export { GROUP_TYPE_OPTIONS, type GroupTypeOption };
