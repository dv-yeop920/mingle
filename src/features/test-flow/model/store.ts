import { create } from 'zustand';

import type { MbtiType } from '@/shared/types/mbti';

import type { GroupType } from '@/entities/group';
import type { Gender } from '@/entities/member';

type TestMember = {
  id: string;
  nickname: string;
  mbti: MbtiType;
  gender: Gender;
  isSelf: boolean;
};

type TestFlowState = {
  groupType: GroupType | null;
  customName: string;
  members: TestMember[];
  isAnalyzing: boolean;
  analysisId: string | null;
};

type TestFlowActions = {
  setGroupType: (type: GroupType | null) => void;
  setCustomName: (name: string) => void;
  addMember: (member: TestMember) => void;
  updateMember: (id: string, updates: Partial<TestMember>) => void;
  removeMember: (id: string) => void;
  setIsAnalyzing: (value: boolean) => void;
  setAnalysisId: (id: string | null) => void;
  reset: () => void;
};

const INITIAL_STATE: TestFlowState = {
  groupType: null,
  customName: '',
  members: [],
  isAnalyzing: false,
  analysisId: null,
};

const useTestFlowStore = create<TestFlowState & TestFlowActions>((set) => ({
  ...INITIAL_STATE,
  setGroupType: (type) => set({ groupType: type }),
  setCustomName: (name) => set({ customName: name }),
  addMember: (member) =>
    set((state) => ({ members: [...state.members, member] })),
  updateMember: (id, updates) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    })),
  removeMember: (id) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
    })),
  setIsAnalyzing: (value) => set({ isAnalyzing: value }),
  setAnalysisId: (id) => set({ analysisId: id }),
  reset: () => set(INITIAL_STATE),
}));

export { useTestFlowStore };
export type { TestFlowActions, TestFlowState, TestMember };
