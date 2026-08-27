'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { GROUP_TYPE_LABELS } from '@/shared/config/group-types';
import { queryKeys } from '@/shared/config/query-keys';
import {
  trackResultRetest,
  trackResultSave,
  trackResultShare,
} from '@/shared/lib/analytics';
import { createClient } from '@/shared/lib/supabase/client';
import { cn } from '@/shared/lib/utils';
import type { Gender } from '@/shared/types/gender';
import type { MbtiType } from '@/shared/types/mbti';

import type { Metric } from '@/entities/analysis';
import {
  InsightCard,
  MetricBar,
  PairCard,
  RoleCard,
  ScoreGauge,
  useAnalysis,
} from '@/entities/analysis';
import type { GroupType } from '@/entities/group';

import {
  GuestSavePromptSheet,
  ResultActions,
  SaveAnalysisSheet,
  convertAtmosphereForStorage,
  saveGuestAnalysis,
} from '@/features/analysis-result';
import {
  PendingAnalysisSaveResumer,
  deletePendingAnalysisSave,
  deletePendingAnalysisSaveIntent,
  fetchPendingAnalysisSaveIntent,
  putPendingAnalysisSave,
  putPendingAnalysisSaveIntent,
  useTestFlowStore,
  type PendingAnalysisSave,
  type TestMember,
} from '@/features/test-flow';

import {
  normalizeAtmosphereSections,
  normalizeMemberRoles,
  normalizeMetrics,
  normalizePairChemistry,
} from './lib/normalize-analysis';
import type { ResultViewProps } from './types';

const METRIC_LABELS: Record<string, string> = {
  conversation: '대화 케미',
  friendship: '우정 / 관계 깊이',
  teamwork: '팀워크',
  atmosphere: '분위기',
  conflict: '갈등 회복력',
};

type SaveAnalysisOptions = {
  isAuthenticated?: boolean;
  pendingSave?: PendingAnalysisSave;
};

const ResultView = ({
  analysisId: propAnalysisId,
  className,
}: ResultViewProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const storeAnalysisId = useTestFlowStore((s) => s.analysisId);
  const storeResult = useTestFlowStore((s) => s.analysisResult);
  const isAnalysisResultHydrated = useTestFlowStore(
    (s) => s.isAnalysisResultHydrated,
  );
  const resetStore = useTestFlowStore((s) => s.reset);
  const setAnalysisResult = useTestFlowStore((s) => s.setAnalysisResult);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingSavePermission, setIsCheckingSavePermission] =
    useState(false);
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false);
  const [isGuestSavePromptOpen, setIsGuestSavePromptOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingAnalysisSave>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const id = propAnalysisId ?? storeAnalysisId ?? '';

  const { data: dbAnalysis, isError, isLoading } = useAnalysis(id);
  const isGuest = !id && !!storeResult;

  useEffect(() => {
    if (!isAnalysisResultHydrated || !isGuest) return;
    if (!fetchPendingAnalysisSaveIntent(window.sessionStorage)) return;

    deletePendingAnalysisSaveIntent(window.sessionStorage);
    const frameId = requestAnimationFrame(() => setIsSaveSheetOpen(true));
    return () => cancelAnimationFrame(frameId);
  }, [isAnalysisResultHydrated, isGuest]);

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
    resetStore();
    router.push('/group-type');
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

  const metrics: Metric[] = Object.entries(normalized.metrics).map(
    ([key, value]) => ({
      label: METRIC_LABELS[key] ?? key,
      value,
      isCaution: false,
    }),
  );

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

  const handleSaveButtonClick = async () => {
    if (!isGuest || isSaving || isCheckingSavePermission) return;

    setSaveError(null);
    setIsCheckingSavePermission(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsSaveSheetOpen(true);
      } else {
        setIsGuestSavePromptOpen(true);
      }
    } catch {
      setSaveError(
        '로그인 상태를 확인하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
      );
    } finally {
      setIsCheckingSavePermission(false);
    }
  };

  const handleSave = async (
    title: string,
    options: SaveAnalysisOptions = {},
  ) => {
    if (!isGuest || !storeResult || isSaving) return;

    setSaveError(null);
    setIsSaving(true);

    const currentPendingSave =
      options.pendingSave ??
      (pendingSave?.title === title
        ? pendingSave
        : { title, saveOperationId: crypto.randomUUID() });
    setPendingSave(currentPendingSave);

    try {
      let isAuthenticated = options.isAuthenticated ?? false;

      if (!isAuthenticated) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        isAuthenticated = !!user;
      }

      if (!isAuthenticated) {
        const isPendingSaveStored = putPendingAnalysisSave(
          currentPendingSave,
          window.sessionStorage,
        );

        if (!isPendingSaveStored) {
          setSaveError(
            '제목을 임시로 보관하지 못했어요. 브라우저 설정을 확인한 뒤 다시 시도해 주세요.',
          );
          return;
        }

        setIsSaveSheetOpen(false);
        setIsGuestSavePromptOpen(true);
        return;
      }

      putPendingAnalysisSave(currentPendingSave, window.sessionStorage);

      const groupAtmosphereForStorage = convertAtmosphereForStorage({
        groupAtmosphere: storeResult.groupAtmosphere,
        decisionMaking: storeResult.decisionMaking,
        cautionPoint: storeResult.cautionPoint,
        bestMoment: storeResult.bestMoment,
      });

      const result = await saveGuestAnalysis({
        title,
        saveOperationId: currentPendingSave.saveOperationId,
        groupType: storeResult.groupType,
        customName: null,
        members: storeResult.members,
        chemistryScore: storeResult.chemistryScore,
        tagline: storeResult.tagline,
        metrics: storeResult.metrics,
        groupAtmosphere: groupAtmosphereForStorage,
        memberRoles: storeResult.memberRoles,
        pairChemistry: storeResult.pairChemistry,
        summary: storeResult.summary,
      });

      if ('error' in result) {
        setSaveError(
          result.error ??
            '결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
        );
        return;
      }

      trackResultSave(storeResult.groupType);
      deletePendingAnalysisSave(window.sessionStorage);
      setIsSaveSheetOpen(false);
      setAnalysisResult(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.analyses.all });
      router.replace('/');
    } catch {
      setSaveError(
        '결과를 저장하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = () => {
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
        <PendingAnalysisSaveResumer
          onResume={async (storedPendingSave) => {
            setPendingSave(storedPendingSave);
            setIsSaveSheetOpen(true);

            try {
              const supabase = createClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) return;

              await handleSave(storedPendingSave.title, {
                isAuthenticated: true,
                pendingSave: storedPendingSave,
              });
            } catch {
              setSaveError(
                '로그인 상태를 확인하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
              );
            }
          }}
        />
      )}
      <div className="relative rounded-b-[34px] bg-green-100 pb-[30px] before:absolute before:inset-x-0 before:bottom-full before:h-[max(12px,env(safe-area-inset-top))] before:bg-green-100 before:content-['']">
        <div className="flex items-center justify-between px-[22px] pb-0 pt-[6px]">
          <button
            type="button"
            aria-label="이전 화면으로"
            onClick={() => (id ? router.back() : router.push('/'))}
            className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] bg-white/60 text-[16px] font-extrabold text-accent btn-press"
          >
            ‹
          </button>
          <span className="text-[15px] font-black text-accent-foreground">
            {groupName}
          </span>
          <button
            type="button"
            onClick={handleShare}
            className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[14px] bg-white/60 text-[15px] text-accent btn-press"
          >
            ↗
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-[30px] pt-[22px]">
          <span className="text-body font-extrabold tracking-wider text-accent">
            {normalized.tagline ?? '우리 그룹 케미'}
          </span>
          <ScoreGauge score={normalized.chemistryScore} size="lg" />
          <p className="text-center text-quote font-extrabold leading-[1.5] text-accent-foreground">
            &ldquo;{normalized.summary}&rdquo;
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

      <div className="flex flex-col gap-8 px-5 pt-8">
        <section className="flex flex-col gap-[15px] rounded-card-lg bg-surface p-5 shadow-md">
          <h3 className="text-section font-black text-foreground">케미 지표</h3>
          {metrics.map((metric) => (
            <MetricBar
              key={metric.label}
              label={metric.label}
              value={metric.value}
              isCaution={metric.isCaution}
            />
          ))}
        </section>

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

      <div className="flex flex-col gap-[11px] px-5 pb-[46px] pt-6">
        <button
          type="button"
          onClick={() => void handleSaveButtonClick()}
          disabled={isSaving || isCheckingSavePermission || !isGuest}
          className="flex h-[60px] cursor-pointer items-center justify-center rounded-[22px] bg-primary font-extrabold text-[17px] text-primary-foreground shadow-lg btn-press"
        >
          {isSaving
            ? '저장 중...'
            : isCheckingSavePermission
              ? '확인 중...'
            : isGuest
              ? '결과 저장하기'
              : '저장된 결과입니다'}
        </button>
        {saveError && (
          <p className="text-center text-caption font-bold text-caution-foreground">
            {saveError}
          </p>
        )}
        <ResultActions
          onRetest={handleRetest}
          onAddMembers={handleAddMembers}
        />
        <button
          type="button"
          onClick={handleShare}
          className="flex h-[54px] cursor-pointer items-center justify-center gap-2 rounded-field bg-primary-tonal text-[14.5px] font-black text-primary-deep btn-press"
        >
          ↗ 결과 공유하기
        </button>
      </div>

      <SaveAnalysisSheet
        isOpen={isSaveSheetOpen}
        onClose={() => {
          setSaveError(null);
          setIsSaveSheetOpen(false);
        }}
        onSubmit={handleSave}
        isSubmitting={isSaving}
        submitError={saveError}
        defaultTitle={pendingSave?.title}
      />
      <GuestSavePromptSheet
        isOpen={isGuestSavePromptOpen}
        onClose={() => setIsGuestSavePromptOpen(false)}
        onConfirm={() => {
          const isIntentStored = putPendingAnalysisSaveIntent(
            window.sessionStorage,
          );
          if (!isIntentStored) {
            setSaveError(
              '저장 흐름을 이어가지 못했어요. 브라우저 설정을 확인한 뒤 다시 시도해 주세요.',
            );
            setIsGuestSavePromptOpen(false);
            return;
          }

          setIsGuestSavePromptOpen(false);
          router.push('/signup?redirect=/result');
        }}
      />
    </div>
  );
};

export { ResultView };
