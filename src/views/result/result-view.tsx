'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { GROUP_TYPE_LABELS } from '@/shared/config/group-types';
import {
  trackResultRetest,
  trackResultShare,
} from '@/shared/lib/analytics';
import { cn } from '@/shared/lib/utils';
import type { Gender } from '@/shared/types/gender';
import type { MbtiType } from '@/shared/types/mbti';

import {
  InsightCard,
  PairCard,
  RoleCard,
  useAnalysis,
} from '@/entities/analysis';
import type { GroupType } from '@/entities/group';

import { makeAnalysisPublic } from '@/features/analysis-result';
import {
  PendingAnalysisSaveResumer,
  useTestFlowStore,
  type TestMember,
} from '@/features/test-flow';

import { useResultSave } from './hooks/use-result-save';
import {
  normalizeAtmosphereSections,
  normalizeMemberRoles,
  normalizeMetrics,
  normalizePairChemistry,
} from './lib/normalize-analysis';
import { ResultActionsFooter } from './result-actions-footer';
import { ResultHero } from './result-hero';
import { ResultMetricsSection } from './result-metrics-section';
import type { ResultViewProps } from './types';

const SaveAnalysisSheet = dynamic(
  () =>
    import(
      '@/features/analysis-result/ui/save-analysis-sheet/save-analysis-sheet'
    ).then((m) => ({ default: m.SaveAnalysisSheet })),
  { ssr: false },
);

const GuestSavePromptSheet = dynamic(
  () =>
    import(
      '@/features/analysis-result/ui/guest-save-prompt-sheet/guest-save-prompt-sheet'
    ).then((m) => ({ default: m.GuestSavePromptSheet })),
  { ssr: false },
);

const METRIC_LABELS: Record<string, string> = {
  conversation: '대화 케미',
  friendship: '우정 / 관계 깊이',
  teamwork: '팀워크',
  atmosphere: '분위기',
  conflict: '갈등 회복력',
};

const ResultView = ({
  analysisId: propAnalysisId,
  className,
}: ResultViewProps) => {
  const router = useRouter();
  const storeAnalysisId = useTestFlowStore((s) => s.analysisId);
  const storeResult = useTestFlowStore((s) => s.analysisResult);
  const isAnalysisResultHydrated = useTestFlowStore(
    (s) => s.isAnalysisResultHydrated,
  );
  const resetStore = useTestFlowStore((s) => s.reset);
  const id = propAnalysisId ?? storeAnalysisId ?? '';

  const { data: dbAnalysis, isError, isLoading } = useAnalysis(id);
  const isGuest = !id && !!storeResult;

  const {
    isSaving,
    isCheckingSavePermission,
    isSaveSheetOpen,
    isGuestSavePromptOpen,
    hasEverOpenedSaveSheet,
    hasEverOpenedGuestSheet,
    pendingSave,
    saveError,
    handleSaveButtonClick,
    handleSave,
    handleSaveSheetClose,
    handleGuestSheetClose,
    handleGuestSheetConfirm,
    onResumePendingSave,
  } = useResultSave({ isGuest });

  const normalized = useMemo(() => {
    if (dbAnalysis) {
      const group = dbAnalysis.groups as {
        type: string;
        members: { nickname: string; mbti: string; gender?: string; is_self: boolean }[];
      } | null;

      return {
        chemistryScore: dbAnalysis.chemistry_score,
        tagline: dbAnalysis.tagline as string | null,
        summary: dbAnalysis.summary,
        metrics: normalizeMetrics(dbAnalysis.metrics),
        atmosphereSource: { groupAtmosphere: dbAnalysis.group_atmosphere },
        roles: dbAnalysis.member_roles,
        pairs: dbAnalysis.pair_chemistry,
        members: group?.members ?? [],
        groupType: group?.type ?? '',
      };
    }

    if (storeResult && !id) {
      return {
        chemistryScore: storeResult.chemistryScore,
        tagline: storeResult.tagline,
        summary: storeResult.summary,
        metrics: storeResult.metrics,
        atmosphereSource: {
          groupAtmosphere: storeResult.groupAtmosphere,
          decisionMaking: storeResult.decisionMaking,
          cautionPoint: storeResult.cautionPoint,
          bestMoment: storeResult.bestMoment,
        },
        roles: storeResult.memberRoles,
        pairs: storeResult.pairChemistry,
        members: storeResult.members,
        groupType: storeResult.groupType,
      };
    }

    return null;
  }, [dbAnalysis, id, storeResult]);

  const handleRetest = () => {
    trackResultRetest();
    setTimeout(() => {
      resetStore();
      router.push('/group-type');
    }, 0);
  };

  const isAddMembersAvailable =
    normalized !== null &&
    (['friends', 'company', 'family'] as string[]).includes(
      normalized.groupType,
    ) &&
    normalized.members.length >= 2;

  const handleAddMembers = isAddMembersAvailable
    ? () => {
        const store = useTestFlowStore.getState();
        const isStoreStale = !store.groupType || store.members.length < 2 || !!id;

        if (isStoreStale && normalized) {
          const testMembers: TestMember[] = normalized.members.map((m) => ({
            id: crypto.randomUUID(),
            nickname: m.nickname,
            mbti: m.mbti as MbtiType,
            gender: ('gender' in m && m.gender ? (m.gender as Gender) : 'other'),
            isSelf: m.is_self,
          }));

          store.restoreMemberDraft({
            schemaVersion: 1 as const,
            groupType: normalized.groupType as GroupType,
            memberCount: testMembers.length,
            members: testMembers,
          });
        }

        router.push('/members');
      }
    : undefined;

  if ((!id && !isAnalysisResultHydrated) || (!isGuest && isLoading)) {
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

  if (!normalized) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 py-12',
          className,
        )}
      >
        <p className="text-body text-muted">
          {saveError ?? '분석 결과를 찾을 수 없습니다'}
        </p>
      </div>
    );
  }

  const metrics = Object.entries(normalized.metrics).map(([key, value]) => ({
    label: METRIC_LABELS[key] ?? key,
    value,
    isCaution: false,
  }));

  const atmosphereSections = normalizeAtmosphereSections(
    normalized.atmosphereSource,
  );
  const roles = normalizeMemberRoles(normalized.roles);
  const pairs = normalizePairChemistry(normalized.pairs, normalized.members);

  const groupName = GROUP_TYPE_LABELS[normalized.groupType] ?? '그룹';
  const memberMbtis = normalized.members.map((m) => m.mbti as MbtiType);

  const handlePairClick = (index: number) => {
    const idQuery = id ? `&id=${id}` : '';
    router.push(`/result/pair-detail?pair=${index}${idQuery}`);
  };

  const handleRoleClick = (index: number) => {
    const idQuery = id ? `&id=${id}` : '';
    router.push(`/result/role-detail?role=${index}${idQuery}`);
  };

  const handlePairsClick = () => {
    const idQuery = id ? `?id=${id}` : '';
    router.push(`/result/pairs${idQuery}`);
  };

  const handleShare = async () => {
    if (id) {
      await makeAnalysisPublic(id);
    }

    const url = isGuest
      ? `${window.location.origin}/`
      : `${window.location.origin}/result?id=${id}`;
    if (navigator.share) {
      trackResultShare('native_share');
      navigator.share({ title: 'MIXTI 케미 분석 결과', url }).catch(() => {});
    } else {
      trackResultShare('clipboard');
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {isGuest && (
        <PendingAnalysisSaveResumer onResume={onResumePendingSave} />
      )}

      <ResultHero
        groupName={groupName}
        tagline={normalized.tagline}
        chemistryScore={normalized.chemistryScore}
        summary={normalized.summary}
        memberMbtis={memberMbtis}
        onBack={() => (id ? router.back() : router.push('/'))}
        onShare={handleShare}
      />

      <div className="flex flex-col gap-8 px-5 pt-8">
        <ResultMetricsSection metrics={metrics} />

        <button
          type="button"
          onClick={() => {
            const idQuery = id ? `?id=${id}` : '';
            router.push(`/result/atmosphere${idQuery}`);
          }}
          className="cursor-pointer text-left btn-press"
        >
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-section font-black text-foreground">
                그룹 분위기
              </h3>
              <span className="text-[12.5px] font-extrabold text-primary">
                상세보기 →
              </span>
            </div>
            {atmosphereSections.slice(0, 2).map((section) => (
              <InsightCard
                key={section.eyebrow}
                variant={section.variant}
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.description}
              />
            ))}
          </div>
        </button>

        <section className="flex flex-col gap-4 rounded-card-lg bg-surface p-5 shadow-md">
          <h3 className="text-section font-black text-foreground">
            우리 안에서의 역할
          </h3>
          <div className="flex flex-col gap-[18px]">
            {roles.map((role, index) => (
              <RoleCard
                key={role.memberId}
                nickname={role.nickname}
                mbti={role.mbti}
                role={role.role}
                description={role.description}
                onClick={() => handleRoleClick(index)}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-[11px]">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-section font-black text-foreground">
              둘 사이의 케미
            </h3>
            {pairs.length > 2 ? (
              <button
                type="button"
                onClick={handlePairsClick}
                className="flex min-h-11 cursor-pointer items-center px-1 text-[12.5px] font-extrabold text-primary btn-press"
              >
                전체보기 →
              </button>
            ) : (
              <span className="text-[12.5px] font-extrabold text-primary">
                전체 {pairs.length}쌍
              </span>
            )}
          </div>
          {pairs.slice(0, 2).map((pair, index) => (
            <PairCard
              key={`${pair.memberA.nickname}-${pair.memberB.nickname}`}
              memberA={pair.memberA}
              memberB={pair.memberB}
              score={pair.score}
              summary={pair.summary}
              onClick={() => handlePairClick(index)}
            />
          ))}
        </section>
      </div>

      <ResultActionsFooter
        isGuest={isGuest}
        isSaving={isSaving}
        isCheckingSavePermission={isCheckingSavePermission}
        saveError={saveError}
        onSave={() => void handleSaveButtonClick()}
        onRetest={handleRetest}
        onAddMembers={handleAddMembers}
        onShare={handleShare}
      />

      {hasEverOpenedSaveSheet && (
        <SaveAnalysisSheet
          isOpen={isSaveSheetOpen}
          onClose={handleSaveSheetClose}
          onSubmit={handleSave}
          isSubmitting={isSaving}
          submitError={saveError}
          defaultTitle={pendingSave?.title}
        />
      )}
      {hasEverOpenedGuestSheet && (
        <GuestSavePromptSheet
          isOpen={isGuestSavePromptOpen}
          onClose={handleGuestSheetClose}
          onConfirm={handleGuestSheetConfirm}
        />
      )}
    </div>
  );
};

export { ResultView };
