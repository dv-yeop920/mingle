import { cn } from '@/shared/lib/utils';

import {
  InsightCard,
  MetricBar,
  PairCard,
  RoleCard,
  ScoreGauge,
} from '@/entities/analysis';

import {
  MOCK_ATMOSPHERES,
  MOCK_CHEMISTRY_SCORE,
  MOCK_METRICS,
  MOCK_PAIRS,
  MOCK_ROLES,
} from './constants';
import type { ResultReportProps } from './types';

const ResultReport = ({
  onAtmosphereClick,
  onPairClick,
  className,
}: ResultReportProps) => {
  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <div className="flex flex-col items-center gap-3">
        <ScoreGauge score={MOCK_CHEMISTRY_SCORE} size="lg" />
        <p className="text-body text-muted">그룹 케미 점수</p>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">상세 지표</h3>
        {MOCK_METRICS.map((metric) => (
          <MetricBar
            key={metric.label}
            label={metric.label}
            value={metric.value}
            isCaution={metric.isCaution}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">그룹 분위기</h3>
        {MOCK_ATMOSPHERES.map((atmo) => (
          <InsightCard
            key={atmo.title}
            variant={atmo.variant}
            eyebrow={atmo.variant === 'positive' ? '강점' : '주의'}
            title={atmo.title}
            description={atmo.description}
            onClick={onAtmosphereClick}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">멤버 역할</h3>
        {MOCK_ROLES.map((role) => (
          <RoleCard
            key={role.memberId}
            nickname={role.nickname}
            mbti={role.mbti}
            role={role.role}
            description={role.description}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">1:1 케미</h3>
        {MOCK_PAIRS.map((pair, index) => (
          <PairCard
            key={`${pair.memberA.nickname}-${pair.memberB.nickname}`}
            memberA={pair.memberA}
            memberB={pair.memberB}
            score={pair.score}
            summary={pair.summary}
            onClick={() => onPairClick?.(index)}
          />
        ))}
      </section>
    </div>
  );
};

export { ResultReport, type ResultReportProps };