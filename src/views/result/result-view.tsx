'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/shared/lib/utils';
import type { MbtiType } from '@/shared/types/mbti';

import type {
  GroupAtmosphere,
  MemberRole,
  Metric,
  PairChemistry,
} from '@/entities/analysis';
import { useAnalysis } from '@/entities/analysis';

import { ResultActions, ResultReport, ShareButton } from '@/features/analysis-result';
import { useTestFlowStore } from '@/features/test-flow';

import type { ResultViewProps } from './types';

const METRIC_LABELS: Record<string, string> = {
  conversation: '대화력',
  friendship: '친밀도',
  teamwork: '팀워크',
  atmosphere: '분위기',
  conflict: '갈등 지수',
};

const ATMOSPHERE_SECTIONS: {
  key: string;
  title: string;
  variant: GroupAtmosphere['variant'];
}[] = [
  { key: 'description', title: '전반적 분위기', variant: 'info' },
  { key: 'decisionMaking', title: '의사결정 방식', variant: 'insight' },
  { key: 'conflict', title: '갈등 상황', variant: 'positive' },
  { key: 'bestMoment', title: '최고의 순간', variant: 'positive' },
];

const ResultView = ({
  analysisId: propAnalysisId,
  className,
}: ResultViewProps) => {
  const router = useRouter();
  const storeAnalysisId = useTestFlowStore((s) => s.analysisId);
  const resetStore = useTestFlowStore((s) => s.reset);
  const id = propAnalysisId ?? storeAnalysisId ?? '';

  const { data: analysis, isLoading } = useAnalysis(id);

  const handleRetest = () => {
    resetStore();
    router.push('/group-type');
  };

  const handleAddMembers = () => {
    router.push('/members');
  };

  if (isLoading) {
    return (
      <div
        className={cn('flex items-center justify-center py-12', className)}
      >
        <p className="text-body text-muted">결과를 불러오는 중...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div
        className={cn('flex items-center justify-center py-12', className)}
      >
        <p className="text-body text-muted">분석 결과를 찾을 수 없습니다</p>
      </div>
    );
  }

  const rawMetrics = analysis.metrics as Record<string, number>;
  const metrics: Metric[] = Object.entries(rawMetrics).map(
    ([key, value]) => ({
      label: METRIC_LABELS[key] ?? key,
      value,
      isCaution: key === 'conflict' && value >= 70,
    }),
  );

  const rawAtmosphere = analysis.group_atmosphere as Record<string, string>;
  const atmospheres: GroupAtmosphere[] = ATMOSPHERE_SECTIONS.map(
    ({ key, title, variant }) => ({
      title,
      description: rawAtmosphere[key] ?? '',
      variant,
    }),
  );

  const rawRoles = analysis.member_roles as {
    nickname: string;
    mbti: string;
    role: string;
    description: string;
  }[];
  const roles: MemberRole[] = rawRoles.map((r, i) => ({
    memberId: String(i),
    nickname: r.nickname,
    mbti: r.mbti as MbtiType,
    role: r.role,
    description: r.description,
  }));

  const members = analysis.groups?.members ?? [];
  const mbtiMap = new Map(members.map((m) => [m.nickname, m.mbti]));

  const rawPairs = analysis.pair_chemistry as {
    memberA: string;
    memberB: string;
    score: number;
    summary: string;
  }[];
  const pairs: PairChemistry[] = rawPairs.map((p) => ({
    memberA: {
      nickname: p.memberA,
      mbti: (mbtiMap.get(p.memberA) ?? 'ENFP') as MbtiType,
    },
    memberB: {
      nickname: p.memberB,
      mbti: (mbtiMap.get(p.memberB) ?? 'ENFP') as MbtiType,
    },
    score: p.score,
    summary: p.summary,
  }));

  return (
    <div className={cn('flex flex-col gap-6 pb-6', className)}>
      <ResultReport
        chemistryScore={analysis.chemistry_score}
        metrics={metrics}
        atmospheres={atmospheres}
        roles={roles}
        pairs={pairs}
      />
      <div className="flex flex-col gap-3 px-5">
        <ShareButton analysisId={id} />
        <ResultActions
          onRetest={handleRetest}
          onAddMembers={handleAddMembers}
        />
      </div>
    </div>
  );
};

export { ResultView };
