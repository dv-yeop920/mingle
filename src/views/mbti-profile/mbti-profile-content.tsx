'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';
import { useToast } from '@/shared/ui';

import type { MbtiProfileResult } from '@/entities/mbti-profile';
import { useMbtiProfile } from '@/entities/mbti-profile';
import { useProfile } from '@/entities/user';

import {
  GenerateProfileButton,
  MbtiProfileResultView,
  saveMbtiProfile,
} from '@/features/mbti-profile';

const MbtiProfileSkeleton = () => (
  <div className="space-y-4 px-5 pt-5" aria-busy="true" role="status">
    <div className="h-[120px] animate-pulse rounded-[20px] bg-muted/20" />
    <div className="h-[160px] animate-pulse rounded-[20px] bg-muted/20" />
    <div className="h-[120px] animate-pulse rounded-[20px] bg-muted/20" />
  </div>
);

const MbtiProfileContent = () => {
  const { userId } = useAuthUserId();
  const { data: profile, isLoading: isProfileLoading } = useProfile(userId);
  const mbti = profile?.mbti ?? '';
  const { data: mbtiProfile, isLoading: isProfileDataLoading } = useMbtiProfile(
    userId,
    mbti,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<MbtiProfileResult | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useToast();

  const isLoading = isProfileLoading || isProfileDataLoading;

  const existingResult = mbtiProfile?.full_analysis as MbtiProfileResult | null;
  const displayResult = result ?? existingResult;

  if (isLoading) {
    return <MbtiProfileSkeleton />;
  }

  if (!profile?.mbti) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 pt-20 text-center">
        <p className="text-[15px] font-bold text-foreground">
          MBTI를 먼저 설정해주세요
        </p>
        <p className="text-[13px] text-muted">
          마이페이지 {'>'} 계정 설정에서 MBTI를 설정할 수 있어요
        </p>
        <button
          onClick={() => router.push('/mypage/settings')}
          className="btn-press cursor-pointer rounded-[12px] bg-primary px-6 py-3 text-[14px] font-bold text-primary-foreground"
        >
          설정하러 가기
        </button>
      </div>
    );
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/analyze-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mbti: profile.mbti,
          gender: profile.gender ?? undefined,
          nickname: profile.nickname,
        }),
      });

      const json = await response.json();

      if (json.error) {
        showToast({ message: json.error, variant: 'error' });
        return;
      }

      setResult(json.data);

      const saveResult = await saveMbtiProfile({
        mbti: profile.mbti!,
        fullAnalysis: json.data,
      });

      if (saveResult.error) {
        showToast({ message: saveResult.error, variant: 'error' });
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.mbtiProfile.all(userId),
      });
    } catch {
      showToast({ message: '분석 중 오류가 발생했어요', variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5 px-5 pb-8 pt-5">
      {displayResult ? (
        <>
          <MbtiProfileResultView
            result={displayResult}
            mbti={profile.mbti!}
          />
          <GenerateProfileButton
            isLoading={isGenerating}
            isRegenerate
            onClick={handleGenerate}
          />
        </>
      ) : (
        <div className="flex flex-col items-center gap-5 pt-10">
          <div className="rounded-[20px] bg-primary/10 p-6 text-center">
            <p className="text-[40px]">🧬</p>
            <h2 className="mt-2 text-[18px] font-black text-foreground">
              내 MBTI를 AI가 분석해볼까?
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              {profile.mbti}의 강점, 약점, 소통 스타일까지 한눈에!
            </p>
          </div>
          <GenerateProfileButton
            isLoading={isGenerating}
            isRegenerate={false}
            onClick={handleGenerate}
          />
        </div>
      )}
    </div>
  );
};

export { MbtiProfileContent };
