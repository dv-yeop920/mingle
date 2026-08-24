import type { MbtiType } from '@/shared/types/mbti';
import { Button } from '@/shared/ui/button';

import { MbtiBadge } from '@/entities/mbti';

type MbtiSectionProps = {
  mbti: string | null;
  onMbtiChange: () => void;
};

const MbtiSection = ({ mbti, onMbtiChange }: MbtiSectionProps) => {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-section font-black text-foreground">MBTI 재설정</h3>
      <div className="flex items-center gap-3">
        <span className="text-body text-muted">현재 MBTI:</span>
        {mbti ? (
          <MbtiBadge mbti={mbti as MbtiType} />
        ) : (
          <span className="text-body text-hint">미설정</span>
        )}
      </div>
      <Button type="button" variant="tonal" onClick={onMbtiChange}>
        MBTI 변경
      </Button>
    </section>
  );
};

export { MbtiSection, type MbtiSectionProps };
