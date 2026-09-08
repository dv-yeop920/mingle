import type { SituationPresetsMap } from './types';

const SITUATION_PRESETS: SituationPresetsMap = {
  friends: [
    { id: 'friends_travel', label: '여행', promptHint: '함께 여행을 갈 때' },
    { id: 'friends_cafe', label: '카페/술자리', promptHint: '카페나 술자리에서 만날 때' },
    { id: 'friends_party', label: '보드게임/파티', promptHint: '보드게임이나 파티를 할 때' },
    { id: 'friends_counsel', label: '고민상담', promptHint: '서로 고민 상담을 할 때' },
    { id: 'friends_planning', label: '약속 잡기', promptHint: '약속을 잡을 때' },
  ],
  company: [
    { id: 'company_kickoff', label: '프로젝트 킥오프', promptHint: '새 프로젝트를 시작할 때' },
    { id: 'company_meeting', label: '회의', promptHint: '회의를 할 때' },
    { id: 'company_crunch', label: '야근/크런치', promptHint: '야근이나 크런치 모드일 때' },
    { id: 'company_dinner', label: '회식', promptHint: '회식 자리에서' },
    { id: 'company_mediation', label: '갈등 중재', promptHint: '팀 내 갈등을 중재할 때' },
  ],
  family: [
    { id: 'family_holiday', label: '명절/가족모임', promptHint: '명절이나 가족 모임에서' },
    { id: 'family_travel', label: '여행', promptHint: '가족 여행을 갈 때' },
    { id: 'family_chores', label: '집안일 분담', promptHint: '집안일을 나눠야 할 때' },
    { id: 'family_counsel', label: '진로/결혼 상담', promptHint: '진로나 결혼 상담을 할 때' },
    { id: 'family_meeting', label: '가족회의', promptHint: '가족 회의를 할 때' },
  ],
} as const;

const SITUATION_FREE_TEXT_MIN_LENGTH = 5;
const SITUATION_FREE_TEXT_MAX_LENGTH = 200;

const findPresetById = (presetId: string) => {
  for (const presets of Object.values(SITUATION_PRESETS)) {
    const found = presets.find((preset) => preset.id === presetId);
    if (found) return found;
  }
  return null;
};

export {
  findPresetById,
  SITUATION_FREE_TEXT_MAX_LENGTH,
  SITUATION_FREE_TEXT_MIN_LENGTH,
  SITUATION_PRESETS,
};
