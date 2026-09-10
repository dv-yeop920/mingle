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
  { type: 'friends', icon: '🧑‍🤝‍🧑', title: '친구', description: '친밀도, 대화, 갈등, 분위기를\n분석해요', iconBg: 'bg-primary-tonal' },
  { type: 'company', icon: '💼', title: '회사 / 팀', description: '업무, 의사결정, 커뮤니케이션\n리더 역할', iconBg: 'bg-sentinel-bg' },
  { type: 'family', icon: '🏠', title: '가족', description: '성향 차이, 대화 방식, 관계를\n분석해요', iconBg: 'bg-explorer-bg' },
];

const GROUP_TYPE_ROLE_PLACEHOLDERS: Partial<Record<GroupType, string>> = {
  company: '직급 (선택)',
  family: '관계 (선택)',
};

export { GROUP_TYPE_OPTIONS, GROUP_TYPE_ROLE_PLACEHOLDERS, type GroupTypeOption };
