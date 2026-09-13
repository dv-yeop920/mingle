'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';
import { Button, useToast } from '@/shared/ui';

import type { MbtiType } from '@/entities/mbti';
import { MbtiPicker } from '@/entities/mbti';
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
  const [guestMbti, setGuestMbti] = useState<MbtiType | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const activeMbti = profile?.mbti ?? guestMbti ?? '';
  const { data: mbtiProfile, isLoading: isProfileDataLoading } = useMbtiProfile(
    userId,
    activeMbti,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<MbtiProfileResult | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const isLoading = userId ? isProfileLoading || isProfileDataLoading : false;

  const existingResult = mbtiProfile?.full_analysis as MbtiProfileResult | null;
  const displayResult = result ?? existingResult;

  if (isLoading) {
    return <MbtiProfileSkeleton />;
  }

  if (!activeMbti) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 pt-20 text-center">
        <p className="text-[40px]">🧬</p>
        <p className="text-[15px] font-bold text-foreground">
          MBTI를 선택해주세요
        </p>
        <p className="text-[13px] text-muted">
          MBTI를 선택하면 AI가 성격 프로필을 분석해줘요
        </p>
        <Button
          variant="primary"
          onClick={() => setIsPickerOpen(true)}
          className="rounded-[12px] px-6 py-3 text-[14px] font-bold"
        >
          MBTI 선택하기
        </Button>
        <MbtiPicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(mbti) => {
            setGuestMbti(mbti);
            setIsPickerOpen(false);
          }}
        />
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
          mbti: activeMbti,
          gender: profile?.gender ?? undefined,
          nickname: profile?.nickname,
        }),
      });

      const json = await response.json();

      if (json.error) {
        showToast({ message: json.error, variant: 'error' });
        return;
      }

      setResult(json.data);

      if (userId) {
        const saveResult = await saveMbtiProfile({
          mbti: activeMbti,
          fullAnalysis: json.data,
        });

        if (saveResult.error) {
          showToast({ message: saveResult.error, variant: 'error' });
        }

        await queryClient.invalidateQueries({
          queryKey: queryKeys.mbtiProfile.all(userId),
        });
      }
    } catch {
      showToast({ message: '분석 중 오류가 발생했어요', variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5 px-5 pb-8 pt-5">
      {!profile?.mbti && (
        <div className="flex items-center justify-between rounded-[16px] bg-muted/10 px-4 py-3">
          <span className="text-[13px] text-muted">
            선택한 MBTI: <strong className="text-foreground">{activeMbti}</strong>
          </span>
          <button
            onClick={() => setIsPickerOpen(true)}
            className="cursor-pointer text-[13px] font-bold text-primary"
          >
            변경
          </button>
          <MbtiPicker
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            onSelect={(mbti) => {
              setGuestMbti(mbti);
              setResult(null);
              setIsPickerOpen(false);
            }}
          />
        </div>
      )}

      {displayResult ? (
        <>
          <MbtiProfileResultView
            result={displayResult}
            mbti={activeMbti}
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
              {activeMbti}의 강점, 약점, 소통 스타일까지 한눈에!
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
