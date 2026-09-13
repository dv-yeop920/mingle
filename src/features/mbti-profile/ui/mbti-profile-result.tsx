'use client';

import { cn } from '@/shared/lib/utils';

import type { MbtiProfileResult } from '@/entities/mbti-profile';

type TraitSectionProps = {
  title: string;
  icon: string;
  items: { title: string; description: string }[];
};

const TraitSection = ({ title, icon, items }: TraitSectionProps) => (
  <section className="rounded-[20px] bg-surface p-5 shadow-sm">
    <h3 className="mb-3 text-[15px] font-black text-foreground">
      {icon} {title}
    </h3>
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.title}>
          <p className="text-[14px] font-bold text-foreground">{item.title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            {item.description}
          </p>
        </li>
      ))}
    </ul>
  </section>
);

type SingleTraitCardProps = {
  title: string;
  icon: string;
  trait: { title: string; description: string };
};

const SingleTraitCard = ({ title, icon, trait }: SingleTraitCardProps) => (
  <section className="rounded-[20px] bg-surface p-5 shadow-sm">
    <h3 className="mb-2 text-[15px] font-black text-foreground">
      {icon} {title}
    </h3>
    <p className="text-[14px] font-bold text-foreground">{trait.title}</p>
    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
      {trait.description}
    </p>
  </section>
);

type MbtiProfileResultViewProps = {
  result: MbtiProfileResult;
  mbti: string;
  className?: string;
};

const MbtiProfileResultView = ({
  result,
  mbti,
  className,
}: MbtiProfileResultViewProps) => (
  <div className={cn('space-y-4', className)}>
    <div className="rounded-[20px] bg-primary/10 p-5 text-center">
      <p className="text-[13px] font-bold text-primary-deep">{mbti}</p>
      <h2 className="mt-1 text-[22px] font-black text-foreground">
        {result.title}
      </h2>
      <p className="mt-1 text-[14px] text-muted">{result.tagline}</p>
    </div>

    <TraitSection title="강점" icon="💪" items={result.strengths} />
    <TraitSection title="약점" icon="🌱" items={result.weaknesses} />
    <SingleTraitCard
      title="소통 스타일"
      icon="💬"
      trait={result.communicationStyle}
    />
    <SingleTraitCard
      title="업무 스타일"
      icon="💼"
      trait={result.workStyle}
    />
    <SingleTraitCard
      title="관계 패턴"
      icon="❤️"
      trait={result.relationshipPatterns}
    />

    <div className="rounded-[20px] bg-insight-surface p-5">
      <p className="text-[13px] font-bold text-insight-foreground">
        💡 알고 있었어?
      </p>
      <p className="mt-1 text-[14px] leading-relaxed text-foreground">
        {result.funFact}
      </p>
    </div>
  </div>
);

export { MbtiProfileResultView };
