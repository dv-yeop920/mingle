import { create } from 'zustand';

import type { Gender } from '@/shared/types/gender';
import type { MbtiType } from '@/shared/types/mbti';

import type { GroupType } from '@/entities/group';

import type { MemberDraft, PersistedAnalysisResult } from './schemas';

type TestMember = {
  id: string;
  nickname: string;
  mbti: MbtiType;
  gender: Gender;
  isSelf: boolean;
};

type SelfMemberSeed = Pick<TestMember, 'gender' | 'mbti' | 'nickname'>;

type AnalysisResult = PersistedAnalysisResult;

type TestFlowState = {
  groupType: GroupType | null;
  memberCount: number;
  members: TestMember[];
  isAnalyzing: boolean;
  analysisId: string | null;
  analysisResult: AnalysisResult | null;
  isAnalysisResultHydrated: boolean;
};

type TestFlowActions = {
  setGroupType: (type: GroupType | null) => void;
  setMemberCount: (count: number) => void;
  initializeMembers: (
    count: number,
    selfMember?: SelfMemberSeed | null,
  ) => void;
  addMember: (member: TestMember) => void;
  updateMember: (id: string, updates: Partial<TestMember>) => void;
  removeMember: (id: string) => void;
  setIsAnalyzing: (value: boolean) => void;
  setAnalysisId: (id: string | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setIsAnalysisResultHydrated: (value: boolean) => void;
  restoreMemberDraft: (draft: MemberDraft) => void;
  reset: () => void;
};

const INITIAL_STATE: TestFlowState = {
  groupType: null,
  memberCount: 0,
  members: [],
  isAnalyzing: false,
  analysisId: null,
  analysisResult: null,
  isAnalysisResultHydrated: false,
};

const useTestFlowStore = create<TestFlowState & TestFlowActions>((set) => ({
  ...INITIAL_STATE,
  setGroupType: (type) => set({ groupType: type }),
  setMemberCount: (count) => set({ memberCount: count }),
  initializeMembers: (count, selfMember) => {
    const members: TestMember[] = Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(),
      nickname: i === 0 ? (selfMember?.nickname ?? '') : '',
      mbti: i === 0 ? (selfMember?.mbti ?? 'ENFP') : 'ISTJ',
      gender: i === 0 ? (selfMember?.gender ?? 'other') : 'other',
      isSelf: i === 0,
    }));
    set({ members });
  },
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
  setAnalysisResult: (result) =>
    set({
      analysisResult: result,
      ...(result ? { analysisId: null } : {}),
    }),
  setIsAnalysisResultHydrated: (value) =>
    set({ isAnalysisResultHydrated: value }),
  restoreMemberDraft: ({ groupType, memberCount, members }) =>
    set({ groupType, memberCount, members }),
  reset: () =>
    set((state) => ({
      ...INITIAL_STATE,
      isAnalysisResultHydrated: state.isAnalysisResultHydrated,
    })),
}));

export { useTestFlowStore };
export type {
  AnalysisResult,
  SelfMemberSeed,
  TestFlowActions,
  TestFlowState,
  TestMember,
};
