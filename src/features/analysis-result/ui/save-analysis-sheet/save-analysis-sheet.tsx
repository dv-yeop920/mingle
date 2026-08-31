'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import {
  analysisTitleSchema,
  type AnalysisTitleFormValues,
} from '../../model/schemas';

import type { SaveAnalysisSheetProps } from './types';

const SaveAnalysisSheet = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitError,
  defaultTitle,
}: SaveAnalysisSheetProps) => {
  const [isLocallySubmitting, setIsLocallySubmitting] = useState(false);
  const isPending = isSubmitting || isLocallySubmitting;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AnalysisTitleFormValues>({
    resolver: zodResolver(analysisTitleSchema),
    defaultValues: { title: '' },
  });

  useEffect(() => {
    if (isOpen && defaultTitle !== undefined) {
      reset({ title: defaultTitle });
    }
  }, [defaultTitle, isOpen, reset]);

  const handleClose = () => {
    if (!isPending) onClose();
  };

  const handleFormSubmit = async (values: AnalysisTitleFormValues) => {
    if (isPending) return;

    setIsLocallySubmitting(true);

    try {
      await onSubmit(values.title);
    } catch {
      setError('root', {
        message: '결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setIsLocallySubmitting(false);
    }
  };

  const errorMessage = submitError ?? errors.root?.message;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="테스트 제목 정하기"
    >
      <form
        aria-label="분석 결과 저장"
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1">
          <p className="text-body font-bold text-muted">
            나중에 쉽게 찾을 수 있도록 이 테스트에 이름을 붙여 주세요.
          </p>
          <p className="text-caption font-bold text-hint">최대 30자</p>
        </div>

        <TextField
          aria-label="테스트 제목"
          placeholder="예: 여름 여행 멤버 케미"
          maxLength={30}
          autoComplete="off"
          autoFocus
          aria-invalid={!!errors.title}
          error={errors.title?.message}
          {...register('title')}
        />

        {errorMessage && (
          <p
            role="alert"
            aria-live="polite"
            className="text-center text-caption font-bold text-caution-foreground"
          >
            {errorMessage}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? '저장 중...' : '완료'}
        </Button>
      </form>
    </BottomSheet>
  );
};

export { SaveAnalysisSheet };
