'use client';

import { sendGAEvent } from '@next/third-parties/google';

const trackSignup = () => {
  sendGAEvent('event', 'sign_up', { method: 'email' });
};

const trackLogin = () => {
  sendGAEvent('event', 'login', { method: 'email' });
};

const trackTestStart = (groupType: string) => {
  sendGAEvent('event', 'test_start', { group_type: groupType });
};

const trackMembersComplete = (groupType: string, memberCount: number) => {
  sendGAEvent('event', 'members_complete', {
    group_type: groupType,
    member_count: memberCount,
  });
};

const trackAnalysisComplete = (
  groupType: string,
  memberCount: number,
  chemistryScore: number,
) => {
  sendGAEvent('event', 'analysis_complete', {
    group_type: groupType,
    member_count: memberCount,
    chemistry_score: chemistryScore,
  });
};

const trackResultShare = (method: 'native_share' | 'clipboard') => {
  sendGAEvent('event', 'result_share', { method });
};

const trackResultSave = (groupType: string) => {
  sendGAEvent('event', 'result_save', { group_type: groupType });
};

const trackResultRetest = () => {
  sendGAEvent('event', 'result_retest');
};

type ResultDetailType =
  | 'atmosphere'
  | 'pairs'
  | 'pair_detail'
  | 'role_detail';

const trackResultDetailView = (detailType: ResultDetailType) => {
  sendGAEvent('event', 'result_detail_view', { detail_type: detailType });
};

export {
  trackAnalysisComplete,
  trackLogin,
  trackMembersComplete,
  trackResultDetailView,
  trackResultRetest,
  trackResultSave,
  trackResultShare,
  trackSignup,
  trackTestStart,
  type ResultDetailType,
};
