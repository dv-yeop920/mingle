'use client';

import { useRouter } from 'next/navigation';

import { GROUP_TYPE_LABELS } from '@/shared/config/group-types';
import { cn } from '@/shared/lib/utils';
import type { MbtiType } from '@/shared/types/mbti';

import type { MemberRole, Metric, PairChemistry } from '@/entities/analysis';
import {
  InsightCard,
  MetricBar,
  PairCard,
  RoleCard,
  ScoreGauge,
  useAnalysis,
} from '@/entities/analysis';

import { ResultActions } from '@/features/analysis-result';
import { useTestFlowStore } from '@/features/test-flow';

import type { ResultViewProps } from './types';

const METRIC_LABELS: Record<string, string> = {
  conversation: '대화 케미',
  friendship: '우정 / 관계 깊이',
  teamwork: '팀워크',
  atmosphere: '분위기',
  conflict: '갈등 가능성',
};

const ATMOSPHERE_SECTIONS: {
  key: string;
  eyebrow: string;
  variant: 'insight' | 'info' | 'positive';
}[] = [
  { key: 'description', eyebrow: 'GROUP ATMOSPHERE', variant: 'insight' },
  { key: 'decisionMaking', eyebrow: 'DECISION MAKING', variant: 'info' },
  { key: 'conflict', eyebrow: '주의 포인트', variant: 'positive' },
  { key: 'bestMoment', eyebrow: 'BEST MOMENT', variant: 'positive' },
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
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">결과를 불러오는 중...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">분석 결과를 찾을 수 없습니다</p>
      </div>
    );
  }

  const rawMetrics = analysis.metrics as Record<string, number>;
  const metrics: Metric[] = Object.entries(rawMetrics).map(([key, value]) => ({
    label: METRIC_LABELS[key] ?? key,
    value,
    isCaution: key === 'conflict' && value >= 70,
  }));

  const rawAtmosphere = analysis.group_atmosphere as Record<string, string>;
  const atmosphereSections = ATMOSPHERE_SECTIONS.map(
    ({ key, eyebrow, variant }) => ({
      eyebrow,
      title: rawAtmosphere[key] ?? '',
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

  const group = analysis.groups as {
    type: string;
    custom_name: string | null;
    members: { nickname: string; mbti: string; is_self: boolean }[];
  } | null;
  const groupName =
    group?.type === 'custom'
      ? (group.custom_name ?? '기타')
      : (GROUP_TYPE_LABELS[group?.type ?? ''] ?? '그룹');

  const memberMbtis = members.map((m) => m.mbti as MbtiType);

  const handlePairClick = (index: number) => {
    router.push(`/result/pair-detail?id=${id}&pair=${index}`);
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="rounded-b-[34px] bg-green-100 pb-[30px]">
        <div className="flex items-center justify-between px-[22px] pb-0 pt-[6px]">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] bg-white/60 text-[16px] font-extrabold text-[#2E6644]"
          >
            ‹
          </button>
          <span className="text-[15px] font-black text-[#1E4630]">
            {groupName}
          </span>
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/result?id=${id}`;
              if (navigator.share) {
                navigator.share({ title: 'MINGLE 케미 분석 결과', url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url);
              }
            }}
            className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] bg-white/60 text-[15px] text-[#2E6644]"
          >
            ↗
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-[30px] pt-[22px]">
          <span className="text-body font-extrabold tracking-wider text-[#2E6644]">
            우리 그룹 케미
          </span>
          <ScoreGauge score={analysis.chemistry_score} size="lg" />
          <p className="text-center text-quote font-extrabold leading-[1.5] text-[#1E4630]">
            &ldquo;{analysis.summary}&rdquo;
          </p>
          {memberMbtis.length > 0 && (
            <div className="flex flex-wrap justify-center gap-[6px] pt-1">
              {memberMbtis.map((mbti, i) => (
                <span
                  key={`${mbti}-${i}`}
                  className="rounded-pill bg-white/75 px-[11px] py-[5px] font-nunito text-[11.5px] font-black text-[#2E6644]"
                >
                  {mbti}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[14px] px-5 pt-6">
        <div className="flex flex-col gap-[15px] rounded-card-lg bg-surface p-5 shadow-md">
          <h3 className="text-section font-black text-foreground">케미 지표</h3>
          {metrics.map((metric) => (
            <MetricBar
              key={metric.label}
              label={metric.label}
              value={metric.value}
              isCaution={metric.isCaution}
            />
          ))}
        </div>

        {atmosphereSections.map((section) => (
          <InsightCard
            key={section.eyebrow}
            variant={section.variant}
            eyebrow={section.eyebrow}
            title={section.title}
            description=""
          />
        ))}

        <div className="flex flex-col gap-[14px] rounded-card-lg bg-surface p-5 shadow-md">
          <h3 className="text-section font-black text-foreground">
            우리 안에서의 역할
          </h3>
          {roles.map((role) => (
            <RoleCard
              key={role.memberId}
              nickname={role.nickname}
              mbti={role.mbti}
              role={role.role}
              description={role.description}
            />
          ))}
        </div>

        <div className="flex flex-col gap-[11px]">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-section font-black text-foreground">
              둘 사이의 케미
            </h3>
            <span className="text-[12.5px] font-extrabold text-primary">
              전체 {pairs.length}쌍
            </span>
          </div>
          {pairs.map((pair, index) => (
            <PairCard
              key={`${pair.memberA.nickname}-${pair.memberB.nickname}`}
              memberA={pair.memberA}
              memberB={pair.memberB}
              score={pair.score}
              summary={pair.summary}
              onClick={() => handlePairClick(index)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[11px] px-5 pb-[46px] pt-6">
        <button
          type="button"
          onClick={() => {}}
          className="flex h-[60px] cursor-pointer items-center justify-center rounded-[22px] bg-primary font-extrabold text-[17px] text-primary-foreground shadow-lg"
        >
          결과 저장하기
        </button>
        <ResultActions onRetest={handleRetest} onAddMembers={handleAddMembers} />
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}/result?id=${id}`;
            if (navigator.share) {
              navigator.share({ title: 'MINGLE 케미 분석 결과', url }).catch(() => {});
            } else {
              navigator.clipboard.writeText(url);
            }
          }}
          className="flex h-[54px] cursor-pointer items-center justify-center gap-2 rounded-field bg-primary-tonal text-[14.5px] font-black text-primary-deep"
        >
          ↗ 결과 공유하기
        </button>
      </div>
    </div>
  );
};

export { ResultView };
