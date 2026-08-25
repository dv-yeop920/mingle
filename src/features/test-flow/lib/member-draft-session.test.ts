import { beforeEach, describe, expect, it } from 'vitest';

import type { MemberDraft } from '../model/schemas';

import {
  fetchMemberDraft,
  MEMBER_DRAFT_STORAGE_KEY,
  putMemberDraft,
} from './member-draft-session';

const MOCK_DRAFT: MemberDraft = {
  schemaVersion: 1,
  groupType: 'friends',
  memberCount: 2,
  members: [
    {
      id: 'member-1',
      nickname: '민지',
      mbti: 'ENFP',
      gender: 'female',
      isSelf: true,
    },
    {
      id: 'member-2',
      nickname: '하니',
      mbti: 'ISTJ',
      gender: 'female',
      isSelf: false,
    },
  ],
};

describe('member draft session', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('멤버 초안을 저장하고 다시 읽는다', () => {
    expect(putMemberDraft(MOCK_DRAFT, sessionStorage)).toBe(true);
    expect(fetchMemberDraft(sessionStorage)).toEqual(MOCK_DRAFT);
  });

  it('손상된 JSON은 삭제하고 복원하지 않는다', () => {
    sessionStorage.setItem(MEMBER_DRAFT_STORAGE_KEY, '{broken');

    expect(fetchMemberDraft(sessionStorage)).toBeNull();
    expect(sessionStorage.getItem(MEMBER_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('현재 스키마와 맞지 않는 초안은 삭제한다', () => {
    sessionStorage.setItem(
      MEMBER_DRAFT_STORAGE_KEY,
      JSON.stringify({ ...MOCK_DRAFT, memberCount: 3 }),
    );

    expect(fetchMemberDraft(sessionStorage)).toBeNull();
    expect(sessionStorage.getItem(MEMBER_DRAFT_STORAGE_KEY)).toBeNull();
  });
});
