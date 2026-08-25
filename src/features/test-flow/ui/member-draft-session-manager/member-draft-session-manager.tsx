'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import {
  deleteMemberDraft,
  fetchMemberDraft,
  putMemberDraft,
} from '@/features/test-flow/lib/member-draft-session';
import type { MemberDraft } from '@/features/test-flow/model/schemas';
import { useTestFlowStore } from '@/features/test-flow/model/store';

const MEMBER_SETUP_PATH = '/members';

const fetchCurrentMemberDraft = (): MemberDraft | null => {
  const { groupType, members } = useTestFlowStore.getState();

  if (!groupType || members.length < 2 || members.length > 15) return null;

  return {
    schemaVersion: 1,
    groupType,
    memberCount: members.length,
    members,
  };
};

const MemberDraftSessionManager = () => {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    const isMemberSetup = pathname === MEMBER_SETUP_PATH;

    if (previousPathname.current === null) {
      if (!isMemberSetup) deleteMemberDraft(window.sessionStorage);

      previousPathname.current = pathname;
      return;
    }

    if (previousPathname.current === MEMBER_SETUP_PATH && !isMemberSetup) {
      deleteMemberDraft(window.sessionStorage);
    }

    previousPathname.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (pathname !== MEMBER_SETUP_PATH) return;

    const currentDraft = fetchCurrentMemberDraft();

    if (currentDraft) {
      putMemberDraft(currentDraft, window.sessionStorage);
    } else {
      const storedDraft = fetchMemberDraft(window.sessionStorage);
      if (storedDraft) {
        useTestFlowStore.getState().restoreMemberDraft(storedDraft);
      }
    }

    return useTestFlowStore.subscribe(() => {
      const nextDraft = fetchCurrentMemberDraft();
      if (nextDraft) putMemberDraft(nextDraft, window.sessionStorage);
    });
  }, [pathname]);

  return null;
};

export { MemberDraftSessionManager };
