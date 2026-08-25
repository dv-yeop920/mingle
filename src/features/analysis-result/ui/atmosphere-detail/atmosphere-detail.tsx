import { cn } from '@/shared/lib/utils';

import { InsightCard, WarningCard } from '@/entities/analysis';

import type { AtmosphereDetailProps } from './types';

const AtmosphereDetail = ({ sections, className }: AtmosphereDetailProps) => {
  if (sections.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">데이터를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <h2 className="text-title2 font-black text-foreground">
        그룹 분위기 상세
      </h2>
      <div className="flex flex-col gap-3">
        {sections.map((section) =>
          section.key === 'cautionPoint' ? (
            <WarningCard
              key={section.key}
              title={section.title}
              description={section.description}
            />
          ) : (
            <InsightCard
              key={section.key}
              variant={section.variant}
              eyebrow={section.eyebrow}
              title={section.title}
              description={section.description}
            />
          ),
        )}
      </div>
    </div>
  );
};

export { AtmosphereDetail };
