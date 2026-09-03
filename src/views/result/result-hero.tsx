import type { MbtiType } from '@/shared/types/mbti';

import { ScoreGauge } from '@/entities/analysis';

type ResultHeroProps = {
  groupName: string;
  tagline: string | null;
  chemistryScore: number;
  summary: string;
  memberMbtis: MbtiType[];
  onBack: () => void;
  onShare: () => void;
};

const ResultHero = ({
  groupName,
  tagline,
  chemistryScore,
  summary,
  memberMbtis,
  onBack,
  onShare,
}: ResultHeroProps) => (
  <div className="relative rounded-b-[34px] bg-green-100 pb-[30px] before:absolute before:inset-x-0 before:bottom-full before:h-[max(12px,env(safe-area-inset-top))] before:bg-green-100 before:content-['']">
    <div className="flex items-center justify-between px-[22px] pb-0 pt-[6px]">
      <button
        type="button"
        aria-label="이전 화면으로"
        onClick={onBack}
        className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] bg-white/60 text-[16px] font-extrabold text-accent btn-press"
      >
        ‹
      </button>
      <span className="text-[15px] font-black text-accent-foreground">
        {groupName}
      </span>
      <button
        type="button"
        onClick={onShare}
        className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] bg-white/60 text-[15px] text-accent btn-press"
      >
        ↗
      </button>
    </div>

    <div className="flex flex-col items-center gap-4 px-[30px] pt-[22px]">
      <span className="text-body font-extrabold tracking-wider text-accent">
        {tagline ?? '우리 그룹 케미'}
      </span>
      <ScoreGauge score={chemistryScore} size="lg" />
      <p className="text-center text-quote font-extrabold leading-[1.5] text-accent-foreground">
        &ldquo;{summary}&rdquo;
      </p>
      {memberMbtis.length > 0 && (
        <div className="flex flex-wrap justify-center gap-[6px] pt-1">
          {memberMbtis.map((mbti, i) => (
            <span
              key={`${mbti}-${i}`}
              className="rounded-pill bg-white/75 px-[11px] py-[5px] font-nunito text-[11.5px] font-black text-accent"
            >
              {mbti}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

export { ResultHero, type ResultHeroProps };
