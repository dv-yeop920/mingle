import type { GroupType } from './types';

type GroupTypeOption = {
  type: GroupType;
  icon: string;
  title: string;
  description: string;
};

const GROUP_TYPE_OPTIONS: GroupTypeOption[] = [
  { type: 'friends', icon: '🧑‍🤝‍🧑', title: '친구', description: '친구들과의 케미를 알아보세요' },
  { type: 'work', icon: '💼', title: '회사·팀', description: '팀원들과의 케미를 분석해요' },
  { type: 'family', icon: '🏠', title: '가족', description: '가족 간의 케미를 확인해요' },
  { type: 'custom', icon: '✏️', title: '기타', description: '직접 그룹 이름을 입력해요' },
];

export { GROUP_TYPE_OPTIONS, type GroupTypeOption };
