import { cn } from '@/shared/lib/utils';

import { AtmosphereDetail } from '@/features/analysis-result';

import type { AtmosphereViewProps } from './types';

const AtmosphereView = ({ className }: AtmosphereViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <AtmosphereDetail />
    </div>
  );
};

export { AtmosphereView, type AtmosphereViewProps };