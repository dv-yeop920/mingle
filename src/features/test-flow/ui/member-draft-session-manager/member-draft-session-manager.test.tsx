import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MEMBER_DRAFT_STORAGE_KEY } from '@/features/test-flow/lib/member-draft-session';
import { useTestFlowStore } from '@/features/test-flow/model/store';

import { MemberDraftSessionManager } from './member-draft-session-manager';

let mockPathname = '/members';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

const SAVED_DRAFT = {
  schemaVersion: 1 as const,
  groupType: 'friends' as const,
  memberCount: 2,
  members: [
    {
      id: 'member-1',
      nickname: '민지',
      mbti: 'ENFP' as const,
      gender: 'female' as const,
      isSelf: true,
    },
    {
      id: 'member-2',
      nickname: '하니',
      mbti: 'ISTJ' as const,
      gender: 'female' as const,
      isSelf: false,
    },
  ],
};

describe('MemberDraftSessionManager', () => {
  beforeEach(() => {
    mockPathname = '/members';
    sessionStorage.clear();
    act(() => useTestFlowStore.getState().reset());
  });

  it('멤버 페이지를 새로 마운트하면 세션 초안을 복원한다', async () => {
    sessionStorage.setItem(
      MEMBER_DRAFT_STORAGE_KEY,
      JSON.stringify(SAVED_DRAFT),
    );

    render(<MemberDraftSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().members).toEqual(SAVED_DRAFT.members);
    });
  });

  it('멤버가 변경되면 현재 인원수와 함께 저장한다', async () => {
    act(() => {
      useTestFlowStore.getState().restoreMemberDraft(SAVED_DRAFT);
      useTestFlowStore.getState().addMember({
        id: 'member-3',
        nickname: '다니',
        mbti: 'INFP',
        gender: 'other',
        isSelf: false,
      });
    });

    render(<MemberDraftSessionManager />);

    await waitFor(() => {
      const saved = JSON.parse(
        sessionStorage.getItem(MEMBER_DRAFT_STORAGE_KEY) ?? '{}',
      );
      expect(saved.memberCount).toBe(3);
      expect(saved.members).toHaveLength(3);
    });
  });

  it('메모리에 진행 중인 멤버가 있으면 저장된 초안보다 우선한다', async () => {
    const currentDraft = {
      ...SAVED_DRAFT,
      members: SAVED_DRAFT.members.map((member, index) =>
        index === 1 ? { ...member, nickname: '현재값' } : member,
      ),
    };
    sessionStorage.setItem(
      MEMBER_DRAFT_STORAGE_KEY,
      JSON.stringify(SAVED_DRAFT),
    );
    act(() => useTestFlowStore.getState().restoreMemberDraft(currentDraft));

    render(<MemberDraftSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().members[1]?.nickname).toBe('현재값');
      expect(
        JSON.parse(sessionStorage.getItem(MEMBER_DRAFT_STORAGE_KEY) ?? '{}')
          .members[1].nickname,
      ).toBe('현재값');
    });
  });

  it('멤버 페이지를 벗어나면 세션 초안을 삭제한다', async () => {
    sessionStorage.setItem(
      MEMBER_DRAFT_STORAGE_KEY,
      JSON.stringify(SAVED_DRAFT),
    );
    const { rerender } = render(<MemberDraftSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().members).toHaveLength(2);
    });

    mockPathname = '/group-type';
    rerender(<MemberDraftSessionManager />);

    await waitFor(() => {
      expect(sessionStorage.getItem(MEMBER_DRAFT_STORAGE_KEY)).toBeNull();
    });
  });
});
