import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTestFlowStore } from './store';
import type { TestMember } from './store';

const MOCK_MEMBER: TestMember = {
  id: 'member-1',
  nickname: '민지',
  mbti: 'ENFP',
  gender: 'female',
  isSelf: true,
};

const MOCK_MEMBER_2: TestMember = {
  id: 'member-2',
  nickname: '하니',
  mbti: 'ISTJ',
  gender: 'female',
  isSelf: false,
};

describe('useTestFlowStore', () => {
  beforeEach(() => {
    act(() => {
      useTestFlowStore.getState().reset();
    });
  });

  it('초기 상태가 올바르다', () => {
    const state = useTestFlowStore.getState();
    expect(state.groupType).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.isAnalyzing).toBe(false);
    expect(state.analysisId).toBeNull();
  });

  it('그룹 타입을 설정한다', () => {
    act(() => {
      useTestFlowStore.getState().setGroupType('friends');
    });
    expect(useTestFlowStore.getState().groupType).toBe('friends');
  });

  it('멤버를 추가한다', () => {
    act(() => {
      useTestFlowStore.getState().addMember(MOCK_MEMBER);
    });
    expect(useTestFlowStore.getState().members).toHaveLength(1);
    expect(useTestFlowStore.getState().members[0]).toEqual(MOCK_MEMBER);
  });

  it('self member seed로 첫 멤버를 초기화한다', () => {
    act(() => {
      useTestFlowStore.getState().initializeMembers(3, {
        nickname: '민지',
        mbti: 'ENFP',
        gender: 'female',
      });
    });

    const { members } = useTestFlowStore.getState();

    expect(members).toHaveLength(3);
    expect(members[0]).toMatchObject({
      nickname: '민지',
      mbti: 'ENFP',
      gender: 'female',
      isSelf: true,
    });
    expect(members[1]).toMatchObject({
      nickname: '',
      mbti: 'ISTJ',
      gender: 'other',
      isSelf: false,
    });
  });

  it('멤버를 업데이트한다', () => {
    act(() => {
      useTestFlowStore.getState().addMember(MOCK_MEMBER);
      useTestFlowStore.getState().updateMember('member-1', { nickname: '민지2' });
    });
    expect(useTestFlowStore.getState().members[0].nickname).toBe('민지2');
  });

  it('존재하지 않는 멤버 업데이트는 무시한다', () => {
    act(() => {
      useTestFlowStore.getState().addMember(MOCK_MEMBER);
      useTestFlowStore.getState().updateMember('nonexistent', { nickname: '없음' });
    });
    expect(useTestFlowStore.getState().members).toHaveLength(1);
    expect(useTestFlowStore.getState().members[0].nickname).toBe('민지');
  });

  it('멤버를 삭제한다', () => {
    act(() => {
      useTestFlowStore.getState().addMember(MOCK_MEMBER);
      useTestFlowStore.getState().addMember(MOCK_MEMBER_2);
      useTestFlowStore.getState().removeMember('member-1');
    });
    expect(useTestFlowStore.getState().members).toHaveLength(1);
    expect(useTestFlowStore.getState().members[0].id).toBe('member-2');
  });

  it('분석 상태를 설정한다', () => {
    act(() => {
      useTestFlowStore.getState().setIsAnalyzing(true);
    });
    expect(useTestFlowStore.getState().isAnalyzing).toBe(true);
  });

  it('분석 ID를 설정한다', () => {
    act(() => {
      useTestFlowStore.getState().setAnalysisId('analysis-123');
    });
    expect(useTestFlowStore.getState().analysisId).toBe('analysis-123');
  });

  it('리셋하면 초기 상태로 돌아간다', () => {
    act(() => {
      useTestFlowStore.getState().setGroupType('work');
      useTestFlowStore.getState().addMember(MOCK_MEMBER);
      useTestFlowStore.getState().setIsAnalyzing(true);
      useTestFlowStore.getState().setAnalysisId('id-1');
      useTestFlowStore.getState().reset();
    });

    const state = useTestFlowStore.getState();
    expect(state.groupType).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.isAnalyzing).toBe(false);
    expect(state.analysisId).toBeNull();
  });
});
