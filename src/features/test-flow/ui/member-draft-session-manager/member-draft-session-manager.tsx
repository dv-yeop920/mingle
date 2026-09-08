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

const DRAFT_PATHS = new Set(['/members', '/situation']);

const fetchCurrentMemberDraft = (): MemberDraft | null => {
  const { groupType, members, situation } = useTestFlowStore.getState();

  if (!groupType || members.length < 2 || members.length > 15) return null;

  return {
    schemaVersion: 2,
    groupType,
    memberCount: members.length,
    members,
    situation,
  };
};

const MemberDraftSessionManager = () => {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    const isDraftPath = DRAFT_PATHS.has(pathname);

    if (previousPathname.current === null) {
      if (!isDraftPath) deleteMemberDraft(window.sessionStorage);

      previousPathname.current = pathname;
      return;
    }

    if (DRAFT_PATHS.has(previousPathname.current) && !isDraftPath) {
      deleteMemberDraft(window.sessionStorage);
    }

    previousPathname.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!DRAFT_PATHS.has(pathname)) return;

    const currentDraft = fetchCurrentMemberDraft();

    if (currentDraft) {
      putMemberDraft(currentDraft, window.sessionStorage);
    } else {
      const storedDraft = fetchMemberDraft(window.sessionStorage);
      if (storedDraft) {
        useTestFlowStore.getState().restoreMemberDraft(storedDraft);
      }
    }

    let prev = {
      groupType: useTestFlowStore.getState().groupType,
      members: useTestFlowStore.getState().members,
      situation: useTestFlowStore.getState().situation,
    };

    return useTestFlowStore.subscribe((state) => {
      if (
        state.groupType === prev.groupType
        && state.members === prev.members
        && state.situation === prev.situation
      ) return;
      prev = { groupType: state.groupType, members: state.members, situation: state.situation };

      const nextDraft = fetchCurrentMemberDraft();
      if (nextDraft) putMemberDraft(nextDraft, window.sessionStorage);
    });
  }, [pathname]);

  return null;
};

export { MemberDraftSessionManager };
