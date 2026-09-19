'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { trackCharacterMatchComplete, trackCharacterMatchGenerate } from '@/shared/lib/analytics';
import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';
import { Button, useToast } from '@/shared/ui';

import type { CharacterMatchResult } from '@/entities/character-match';
import { useCharacterMatch, WORKS } from '@/entities/character-match';
import type { MbtiType } from '@/entities/mbti';
import { MbtiPicker } from '@/entities/mbti';
import { useProfile } from '@/entities/user';

import {
  CharacterMatchResultView,
  saveCharacterMatch,
  WorkSelector,
} from '@/features/character-match';

const CharacterMatchSkeleton = () => (
  <div className="space-y-4 px-5 pt-5" aria-busy="true" role="status">
    <div className="h-[140px] animate-pulse rounded-[20px] bg-muted/20" />
    <div className="h-[100px] animate-pulse rounded-[20px] bg-muted/20" />
    <div className="h-[80px] animate-pulse rounded-[20px] bg-muted/20" />
  </div>
);

const CharacterMatchContent = () => {
  const { userId } = useAuthUserId();
  const { data: profile, isLoading: isProfileLoading } = useProfile(userId);
  const [guestMbti, setGuestMbti] = useState<MbtiType | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const activeMbti = profile?.mbti ?? guestMbti ?? '';
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CharacterMatchResult | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const selectedWork = WORKS.find((w) => w.id === selectedWorkId);

  const { data: cachedMatch, isLoading: isCacheLoading } = useCharacterMatch(
    userId,
    activeMbti,
    selectedWorkId ?? '',
  );

  const existingResult = cachedMatch?.full_result as CharacterMatchResult | null;
  const displayResult = result ?? existingResult;
  const displayWorkName =
    selectedWork?.name ?? cachedMatch?.work_name ?? '';

  const handleSelect = (workId: string) => {
    setSelectedWorkId(workId);
    setResult(null);
  };

  const handleGenerate = async () => {
    if (!selectedWork || !activeMbti) return;

    trackCharacterMatchGenerate(activeMbti, selectedWork.id);
    setIsGenerating(true);
    try {
      const response = await fetch('/api/character-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mbti: activeMbti,
          workId: selectedWork.id,
          workName: selectedWork.name,
        }),
      });

      const json = await response.json();

      if (json.error) {
        showToast({ message: json.error, variant: 'error' });
        return;
      }

      trackCharacterMatchComplete(activeMbti, selectedWork.id);
      setResult(json.data);

      if (userId) {
        const saveResult = await saveCharacterMatch({
          mbti: activeMbti,
          workId: selectedWork.id,
          workName: selectedWork.name,
          fullResult: json.data,
        });

        if (saveResult.error) {
          showToast({ message: saveResult.error, variant: 'error' });
        }

        await queryClient.invalidateQueries({
          queryKey: queryKeys.characterMatch.detail(
            userId,
            activeMbti,
            selectedWork.id,
          ),
        });
      }
    } catch {
      showToast({ message: '매칭 중 오류가 발생했어요', variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (userId && isProfileLoading) {
    return <CharacterMatchSkeleton />;
  }

  if (!activeMbti) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 pt-20 text-center">
        <p className="text-[40px]">🎭</p>
        <p className="text-[15px] font-bold text-foreground">
          MBTI를 선택해주세요
        </p>
        <p className="text-[13px] text-muted">
          MBTI를 선택하면 나와 닮은 캐릭터를 찾아줘요
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

      <div className="rounded-[20px] bg-primary/10 p-5 text-center">
        <p className="text-[40px]">🎭</p>
        <h2 className="mt-2 text-[18px] font-black text-foreground">
          나와 닮은 캐릭터는?
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          작품을 선택하면 {activeMbti}와 가장 닮은 캐릭터를 찾아줄게!
        </p>
      </div>

      <section>
        <h3 className="mb-3 text-[15px] font-black text-foreground">
          작품 선택
        </h3>
        <WorkSelector
          selectedWorkId={selectedWorkId}
          onSelect={handleSelect}
        />
      </section>

      {selectedWorkId && !displayResult && !isCacheLoading && (
        <Button
          variant="primary"
          disabled={isGenerating}
          onClick={handleGenerate}
          className="rounded-[16px] py-4 text-[16px] font-bold"
        >
          {isGenerating
            ? '매칭 중...'
            : `${selectedWork?.name}에서 찾기`}
        </Button>
      )}

      {isCacheLoading && selectedWorkId && (
        <CharacterMatchSkeleton />
      )}

      {displayResult && displayWorkName && (
        <>
          <CharacterMatchResultView
            result={displayResult}
            workName={displayWorkName}
            mbti={activeMbti}
          />
          <Button
            variant="tonal"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="rounded-[16px] py-4 text-[16px] font-bold"
          >
            {isGenerating ? '매칭 중...' : '다시 매칭하기'}
          </Button>
        </>
      )}
    </div>
  );
};

export { CharacterMatchContent };
