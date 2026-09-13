'use client';

import { useRouter } from 'next/navigation';

import { getTemperamentStyles } from '@/shared/lib/mbti';
import { useAuthUserId } from '@/shared/lib/supabase/use-auth-user-id';
import { cn } from '@/shared/lib/utils';
import type { MbtiType } from '@/shared/types/mbti';
import { Button } from '@/shared/ui/button';

import type { CompatibilityResult } from '@/entities/compatibility';
import { useCompatibility } from '@/entities/compatibility';

import { useCompatibilityStore } from '@/features/compatibility';

type CompatibilityResultViewProps = {
  analysisId?: string;
  className?: string;
};

type CategoryCardProps = {
  title: string;
  description: string;
  score: number;
  color: string;
};

const CategoryCard = ({ title, description, score, color }: CategoryCardProps) => (
  <div className="flex flex-col gap-3 rounded-[20px] bg-surface p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <h3 className="text-[15px] font-black text-foreground">{title}</h3>
      <div className="flex items-center gap-1.5">
        <div className="h-[6px] w-[60px] overflow-hidden rounded-pill bg-muted/15">
          <div
            className="h-full rounded-pill transition-all duration-500"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
        <span className="font-nunito text-[13px] font-black" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
    <p className="text-[13px] font-medium leading-[1.6] text-muted">
      {description}
    </p>
  </div>
);

type InsightCardProps = {
  emoji: string;
  title: string;
  description: string;
  bgColor: string;
};

const InsightCard = ({ emoji, title, description, bgColor }: InsightCardProps) => (
  <div className="flex flex-col gap-2 rounded-[20px] p-5 shadow-sm" style={{ backgroundColor: bgColor }}>
    <div className="flex items-center gap-2">
      <span className="text-[18px]">{emoji}</span>
      <h3 className="text-[15px] font-black text-foreground">{title}</h3>
    </div>
    <p className="text-[13px] font-medium leading-[1.6] text-muted">
      {description}
    </p>
  </div>
);

const ScoreGauge = ({ score }: { score: number }) => {
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[80px] w-[160px] overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-[8px] border-b-0 border-compat-surface" />
        <div
          className="absolute bottom-0 left-1/2 h-[4px] w-[60px] origin-left rounded-pill bg-compat transition-transform duration-700"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>
      <span className="font-nunito text-[36px] font-black text-compat">
        {score}
      </span>
    </div>
  );
};

const CompatibilityResultView = ({
  analysisId: propAnalysisId,
  className,
}: CompatibilityResultViewProps) => {
  const router = useRouter();
  const { userId } = useAuthUserId();
  const storeAnalysisId = useCompatibilityStore((s) => s.analysisId);
  const storeResult = useCompatibilityStore((s) => s.analysisResult);
  const isResultHydrated = useCompatibilityStore((s) => s.isResultHydrated);
  const mbtiA = useCompatibilityStore((s) => s.mbtiA);
  const mbtiB = useCompatibilityStore((s) => s.mbtiB);
  const nicknameA = useCompatibilityStore((s) => s.nicknameA);
  const nicknameB = useCompatibilityStore((s) => s.nicknameB);
  const resetStore = useCompatibilityStore((s) => s.reset);

  const id = propAnalysisId ?? storeAnalysisId ?? '';
  const { data: dbAnalysis, isError, isLoading } = useCompatibility(userId, id);
  const isGuest = !id && !!storeResult;

  const result: CompatibilityResult | null = (() => {
    if (dbAnalysis) return dbAnalysis.result as unknown as CompatibilityResult;
    if (storeResult && !id) return storeResult;
    return null;
  })();

  const displayMbtiA = (dbAnalysis?.mbti_a ?? mbtiA ?? 'ENFP') as MbtiType;
  const displayMbtiB = (dbAnalysis?.mbti_b ?? mbtiB ?? 'INTJ') as MbtiType;
  const displayNicknameA = dbAnalysis?.nickname_a ?? nicknameA ?? '';
  const displayNicknameB = dbAnalysis?.nickname_b ?? nicknameB ?? '';

  const stylesA = getTemperamentStyles(displayMbtiA);
  const stylesB = getTemperamentStyles(displayMbtiB);

  if ((!id && !isResultHydrated) || (!isGuest && isLoading)) {
    return (
      <div
        role="status"
        aria-label="결과를 불러오는 중"
        aria-busy="true"
        className={cn(
          'flex min-h-[118px] items-center justify-center py-12',
          className,
        )}
      />
    );
  }

  if (id && isError) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">
          결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">분석 결과를 찾을 수 없습니다</p>
      </div>
    );
  }

  const handleRetest = () => {
    resetStore();
    router.push('/compatibility');
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-compat-bg to-background px-5 pb-8 pt-8">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-[14px] px-4 py-2', stylesA.bg)}>
            <span className={cn('font-nunito text-[18px] font-black', stylesA.fg)}>
              {displayMbtiA}
            </span>
          </div>
          <span className="text-[20px] font-black text-muted/50">×</span>
          <div className={cn('rounded-[14px] px-4 py-2', stylesB.bg)}>
            <span className={cn('font-nunito text-[18px] font-black', stylesB.fg)}>
              {displayMbtiB}
            </span>
          </div>
        </div>

        {(displayNicknameA || displayNicknameB) && (
          <p className="text-[13px] font-bold text-muted">
            {displayNicknameA || displayMbtiA} & {displayNicknameB || displayMbtiB}
          </p>
        )}

        <ScoreGauge score={result.chemistryScore} />

        <h1 className="text-[22px] font-black text-foreground">{result.title}</h1>
        <p className="text-[14px] font-bold text-muted">{result.tagline}</p>
        <p className="text-center text-[14px] font-medium leading-[1.6] text-foreground/80">
          {result.summary}
        </p>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8">
        <h2 className="text-[17px] font-black text-foreground">상세 분석</h2>

        <CategoryCard
          title={result.conversationStyle.title}
          description={result.conversationStyle.description}
          score={result.conversationStyle.score}
          color="var(--compat-conversation)"
        />
        <CategoryCard
          title={result.conflictStyle.title}
          description={result.conflictStyle.description}
          score={result.conflictStyle.score}
          color="var(--compat-conflict)"
        />
        <CategoryCard
          title={result.emotionalConnection.title}
          description={result.emotionalConnection.description}
          score={result.emotionalConnection.score}
          color="var(--compat)"
        />
        <CategoryCard
          title={result.growthPotential.title}
          description={result.growthPotential.description}
          score={result.growthPotential.score}
          color="var(--compat-accent)"
        />

        <InsightCard
          emoji="✨"
          title={result.bestMoment.title}
          description={result.bestMoment.description}
          bgColor="var(--compat-insight-surface)"
        />

        <InsightCard
          emoji="⚡"
          title={result.cautionPoint.title}
          description={result.cautionPoint.description}
          bgColor="var(--compat-caution-surface)"
        />

        <div className="flex flex-col gap-3 rounded-[20px] bg-surface p-5 shadow-sm">
          <h3 className="text-[15px] font-black text-foreground">
            추천 활동
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.recommendedActivities.map((activity) => (
              <span
                key={activity}
                className="rounded-pill bg-primary/10 px-3 py-1.5 text-[13px] font-bold text-primary"
              >
                {activity}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] bg-compat-bg p-5">
          <p className="text-[14px] font-medium leading-[1.7] text-foreground/80">
            💡 {result.advice}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button variant="primary" onClick={handleRetest}>
            다른 궁합 분석하기
          </Button>
          <Button variant="secondary" onClick={() => router.push('/')}>
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
};

export { CompatibilityResultView };
