'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { AtmosphereDetail } from '@/features/analysis-result';

import type { AtmosphereViewProps } from './types';

const AtmosphereView = ({ analysisId, className }: AtmosphereViewProps) => {
  const router = useRouter();

  return (
    <div className={cn('flex flex-col gap-4 px-5 pt-4', className)}>
      <button
        type="button"
        onClick={() => router.back()}
        className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] border border-border bg-surface"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 2L4 7L9 12" />
        </svg>
      </button>
      <AtmosphereDetail analysisId={analysisId} />
    </div>
  );
};

export { AtmosphereView };
