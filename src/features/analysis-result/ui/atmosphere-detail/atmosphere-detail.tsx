import { cn } from '@/shared/lib/utils';

import { InsightCard } from '@/entities/analysis';

import { MOCK_ATMOSPHERE_DETAILS } from './constants';
import type { AtmosphereDetailProps } from './types';

const AtmosphereDetail = ({ className }: AtmosphereDetailProps) => {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <h2 className="text-title2 font-black text-foreground">그룹 분위기 상세</h2>
      <div className="flex flex-col gap-3">
        {MOCK_ATMOSPHERE_DETAILS.map((item) => (
          <InsightCard
            key={item.title}
            variant={item.variant}
            eyebrow={item.eyebrow}
            title={item.title}
            description={item.description}
          />
        ))}
      </div>
    </div>
  );
};

export { AtmosphereDetail, type AtmosphereDetailProps };