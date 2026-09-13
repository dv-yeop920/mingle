import { create } from 'zustand';

import type { MbtiType } from '@/shared/types/mbti';

import type { CompatibilityResult } from '@/entities/compatibility';

type CompatibilityState = {
  mbtiA: MbtiType | null;
  mbtiB: MbtiType | null;
  nicknameA: string;
  nicknameB: string;
  analysisId: string | null;
  analysisResult: CompatibilityResult | null;
  isResultHydrated: boolean;
};

type CompatibilityActions = {
  setMbtiA: (mbti: MbtiType | null) => void;
  setMbtiB: (mbti: MbtiType | null) => void;
  setNicknameA: (nickname: string) => void;
  setNicknameB: (nickname: string) => void;
  setAnalysisId: (id: string | null) => void;
  setAnalysisResult: (result: CompatibilityResult | null) => void;
  setIsResultHydrated: (value: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: CompatibilityState = {
  mbtiA: null,
  mbtiB: null,
  nicknameA: '',
  nicknameB: '',
  analysisId: null,
  analysisResult: null,
  isResultHydrated: false,
};

const useCompatibilityStore = create<CompatibilityState & CompatibilityActions>(
  (set) => ({
    ...INITIAL_STATE,
    setMbtiA: (mbti) => set({ mbtiA: mbti }),
    setMbtiB: (mbti) => set({ mbtiB: mbti }),
    setNicknameA: (nickname) => set({ nicknameA: nickname }),
    setNicknameB: (nickname) => set({ nicknameB: nickname }),
    setAnalysisId: (id) => set({ analysisId: id }),
    setAnalysisResult: (result) =>
      set({ analysisResult: result, ...(result ? { analysisId: null } : {}) }),
    setIsResultHydrated: (value) => set({ isResultHydrated: value }),
    reset: () =>
      set((state) => ({
        ...INITIAL_STATE,
        isResultHydrated: state.isResultHydrated,
      })),
  }),
);

export { useCompatibilityStore };
export type { CompatibilityActions, CompatibilityState };
