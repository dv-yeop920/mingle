'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { trackSituationComplete } from '@/shared/lib/analytics';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';

import {
  SITUATION_FREE_TEXT_MAX_LENGTH,
  SITUATION_FREE_TEXT_MIN_LENGTH,
  SITUATION_PRESETS,
  type SituationInput,
} from '@/entities/situation';

import { useTestFlowStore } from '@/features/test-flow';

const SituationView = () => {
  const router = useRouter();
  const groupType = useTestFlowStore((s) => s.groupType);
  const storedSituation = useTestFlowStore((s) => s.situation);
  const setSituation = useTestFlowStore((s) => s.setSituation);

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    storedSituation?.type === 'preset' ? storedSituation.presetId : null,
  );
  const [freeText, setFreeText] = useState(
    storedSituation?.type === 'freeText' ? storedSituation.text : '',
  );

  useEffect(() => {
    if (!groupType) {
      router.replace('/group-type');
    }
  }, [groupType, router]);

  if (!groupType) return null;

  const presets = SITUATION_PRESETS[groupType];

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId((prev) => (prev === presetId ? null : presetId));
    setFreeText('');
  };

  const handleFreeTextChange = (value: string) => {
    setFreeText(value);
    setSelectedPresetId(null);
  };

  const buildSituationInput = (): SituationInput | null => {
    if (selectedPresetId) {
      return { type: 'preset', presetId: selectedPresetId };
    }
    if (freeText.length >= SITUATION_FREE_TEXT_MIN_LENGTH) {
      return { type: 'freeText', text: freeText };
    }
    return null;
  };

  const situationInput = buildSituationInput();
  const isValid = situationInput !== null;

  const handleSubmit = () => {
    const situationType = situationInput?.type ?? 'skip';
    trackSituationComplete(groupType, situationType);
    setSituation(situationInput);
    router.push('/analyzing');
  };

  const handleSkip = () => {
    trackSituationComplete(groupType, 'skip');
    setSituation(null);
    router.push('/analyzing');
  };

  return (
    <div className="flex h-dvh flex-col">
      <div className="shrink-0 px-[22px] pt-[6px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/members')}
            className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] border border-border bg-surface text-[16px] font-extrabold text-muted btn-press"
          >
            ‹
          </button>
          <span className="text-[16px] font-extrabold text-foreground">
            상황 선택
          </span>
        </div>
        <div className="flex flex-col gap-[5px] pt-[22px]">
          <h2 className="text-[24px] font-black tracking-title text-foreground">
            어떤 상황에서 분석할까요?
          </h2>
          <p className="text-[13.5px] font-bold text-subtitle">
            상황에 따라 분석이 달라져요.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-[22px]">
        <div className="flex flex-wrap gap-[10px]">
          {presets.map((preset) => (
            <Chip
              key={preset.id}
              label={preset.label}
              isActive={selectedPresetId === preset.id}
              onClick={() => handlePresetSelect(preset.id)}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 py-[22px]">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[12px] font-bold text-muted">직접 입력</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="relative">
          <textarea
            value={freeText}
            onChange={(e) => handleFreeTextChange(e.target.value)}
            placeholder="예: 이번 주말 제주도 여행 가는데 숙소에서 보드게임 하려고"
            maxLength={SITUATION_FREE_TEXT_MAX_LENGTH}
            rows={3}
            className={cn(
              'w-full resize-none rounded-[14px] border border-border bg-surface px-4 py-3',
              'text-[14px] font-medium text-foreground placeholder:text-muted',
              'focus:border-primary focus:outline-none',
              freeText.length > 0 && selectedPresetId === null && 'border-primary',
            )}
          />
          <span
            className={cn(
              'absolute bottom-3 right-4 text-[11px] font-bold',
              freeText.length > 0 && freeText.length < SITUATION_FREE_TEXT_MIN_LENGTH
                ? 'text-caution-foreground'
                : 'text-muted',
            )}
          >
            {freeText.length}/{SITUATION_FREE_TEXT_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="shrink-0 px-6 pb-[44px] pt-3">
        <Button
          variant="primary"
          disabled={!isValid}
          onClick={handleSubmit}
        >
          분석 시작
        </Button>
        <button
          type="button"
          onClick={handleSkip}
          className="mt-3 w-full cursor-pointer py-2 text-center text-[13px] font-bold text-muted"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
};

export { SituationView };
