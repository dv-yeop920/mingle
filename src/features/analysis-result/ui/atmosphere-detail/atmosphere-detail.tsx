'use client';

import { cn } from '@/shared/lib/utils';

import { InsightCard, useAnalysis } from '@/entities/analysis';

import type { AtmosphereDetailProps } from './types';

const ATMOSPHERE_SECTIONS: {
  key: string;
  eyebrow: string;
  title: string;
  variant: 'insight' | 'info' | 'positive';
}[] = [
  { key: 'description', eyebrow: 'GROUP ATMOSPHERE', title: '전반적인 분위기', variant: 'insight' },
  { key: 'decisionMaking', eyebrow: 'DECISION MAKING', title: '의사결정 패턴', variant: 'info' },
  { key: 'conflict', eyebrow: '주의 포인트', title: '갈등 상황', variant: 'positive' },
  { key: 'bestMoment', eyebrow: 'BEST MOMENT', title: '가장 빛나는 순간', variant: 'positive' },
];

const AtmosphereDetail = ({ analysisId, className }: AtmosphereDetailProps) => {
  const { data: analysis, isLoading } = useAnalysis(analysisId ?? '');

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">불러오는 중...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">데이터를 찾을 수 없습니다</p>
      </div>
    );
  }

  const rawAtmosphere = analysis.group_atmosphere as Record<string, string>;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <h2 className="text-title2 font-black text-foreground">그룹 분위기 상세</h2>
      <div className="flex flex-col gap-3">
        {ATMOSPHERE_SECTIONS.map((section) => (
          <InsightCard
            key={section.key}
            variant={section.variant}
            eyebrow={section.eyebrow}
            title={section.title}
            description={rawAtmosphere[section.key] ?? ''}
          />
        ))}
      </div>
    </div>
  );
};

export { AtmosphereDetail };
