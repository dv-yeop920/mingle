import type { GroupType } from '@/entities/group';

type SituationPreset = {
  id: string;
  label: string;
  promptHint: string;
};

type SituationInput =
  | { type: 'preset'; presetId: string }
  | { type: 'freeText'; text: string };

type SituationPresetsMap = Record<GroupType, SituationPreset[]>;

export type { SituationInput, SituationPreset, SituationPresetsMap };
