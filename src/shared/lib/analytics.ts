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

const trackSituationComplete = (
  groupType: string,
  situationType: 'preset' | 'freeText' | 'skip',
) => {
  sendGAEvent('event', 'situation_complete', {
    group_type: groupType,
    situation_type: situationType,
  });
};

const trackResultRetest = () => {
  sendGAEvent('event', 'result_retest');
};

const trackSharedResultView = () => {
  sendGAEvent('event', 'shared_result_view');
};

const trackTryItCtaClick = (position: 'top' | 'bottom') => {
  sendGAEvent('event', 'try_it_cta_click', { position });
};

type ResultDetailType =
  | 'atmosphere'
  | 'pairs'
  | 'pair_detail'
  | 'role_detail';

const trackResultDetailView = (detailType: ResultDetailType) => {
  sendGAEvent('event', 'result_detail_view', { detail_type: detailType });
};

const trackCompatibilityStart = (mbtiA: string, mbtiB: string) => {
  sendGAEvent('event', 'compatibility_start', { mbti_a: mbtiA, mbti_b: mbtiB });
};

const trackCompatibilityComplete = (mbtiA: string, mbtiB: string, chemistryScore: number) => {
  sendGAEvent('event', 'compatibility_complete', {
    mbti_a: mbtiA,
    mbti_b: mbtiB,
    chemistry_score: chemistryScore,
  });
};

const trackCompatibilityRetest = () => {
  sendGAEvent('event', 'compatibility_retest');
};

const trackCharacterMatchGenerate = (mbti: string, workId: string) => {
  sendGAEvent('event', 'character_match_generate', { mbti, work_id: workId });
};

const trackCharacterMatchComplete = (mbti: string, workId: string) => {
  sendGAEvent('event', 'character_match_complete', { mbti, work_id: workId });
};

const trackMbtiProfileGenerate = (mbti: string) => {
  sendGAEvent('event', 'mbti_profile_generate', { mbti });
};

const trackMbtiProfileComplete = (mbti: string) => {
  sendGAEvent('event', 'mbti_profile_complete', { mbti });
};

export {
  trackAnalysisComplete,
  trackCharacterMatchComplete,
  trackCharacterMatchGenerate,
  trackCompatibilityComplete,
  trackCompatibilityRetest,
  trackCompatibilityStart,
  trackLogin,
  trackMbtiProfileComplete,
  trackMbtiProfileGenerate,
  trackMembersComplete,
  trackResultDetailView,
  trackResultRetest,
  trackResultSave,
  trackResultShare,
  trackSharedResultView,
  trackSignup,
  trackSituationComplete,
  trackTestStart,
  trackTryItCtaClick,
  type ResultDetailType,
};
