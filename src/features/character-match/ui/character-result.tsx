'use client';

import { cn } from '@/shared/lib/utils';

import type { CharacterMatchResult } from '@/entities/character-match';

type CharacterMatchResultViewProps = {
  result: CharacterMatchResult;
  workName: string;
  mbti: string;
  className?: string;
};

const CharacterMatchResultView = ({
  result,
  workName,
  mbti,
  className,
}: CharacterMatchResultViewProps) => (
  <div className={cn('space-y-4', className)}>
    <div className="rounded-[20px] bg-primary/10 p-5 text-center">
      <p className="text-[13px] font-bold text-primary-deep">
        {mbti} × {workName}
      </p>
      <h2 className="mt-2 text-[28px] font-black text-foreground">
        {result.characterName}
      </h2>
      <div className="mt-2 inline-flex items-center gap-1 rounded-pill bg-primary px-4 py-1.5">
        <span className="text-[13px] font-bold text-primary-foreground">
          매칭률 {result.matchScore}%
        </span>
      </div>
    </div>

    <section className="rounded-[20px] bg-surface p-5 shadow-sm">
      <h3 className="mb-2 text-[15px] font-black text-foreground">
        🎯 왜 닮았을까?
      </h3>
      <p className="text-[14px] leading-relaxed text-muted">
        {result.matchReason}
      </p>
    </section>

    <section className="rounded-[20px] bg-surface p-5 shadow-sm">
      <h3 className="mb-3 text-[15px] font-black text-foreground">
        🤝 공통 특성
      </h3>
      <div className="flex flex-wrap gap-2">
        {result.sharedTraits.map((trait) => (
          <span
            key={trait}
            className="rounded-pill border border-primary/30 bg-primary-tonal px-3 py-1.5 text-[13px] font-bold text-primary-deep"
          >
            {trait}
          </span>
        ))}
      </div>
    </section>

    <div className="rounded-[20px] bg-insight-surface p-5">
      <p className="text-[13px] font-bold text-insight-foreground">
        💬 한 마디
      </p>
      <p className="mt-1 text-[14px] leading-relaxed text-foreground">
        {result.funLine}
      </p>
    </div>
  </div>
);

export { CharacterMatchResultView };
