'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { queryKeys } from '@/shared/config/query-keys';
import { trackResultSave } from '@/shared/lib/analytics';
import { createClient } from '@/shared/lib/supabase/client';

import {
  convertAtmosphereForStorage,
  saveGuestAnalysis,
} from '@/features/analysis-result';
import {
  deletePendingAnalysisSave,
  deletePendingAnalysisSaveIntent,
  fetchPendingAnalysisSaveIntent,
  putPendingAnalysisSave,
  putPendingAnalysisSaveIntent,
  useTestFlowStore,
  type PendingAnalysisSave,
} from '@/features/test-flow';

type UseResultSaveParams = {
  isGuest: boolean;
};

type SaveAnalysisOptions = {
  isAuthenticated?: boolean;
  pendingSave?: PendingAnalysisSave;
};

const useResultSave = ({ isGuest }: UseResultSaveParams) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const storeResult = useTestFlowStore((s) => s.analysisResult);
  const isAnalysisResultHydrated = useTestFlowStore(
    (s) => s.isAnalysisResultHydrated,
  );
  const setAnalysisResult = useTestFlowStore((s) => s.setAnalysisResult);

  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingSavePermission, setIsCheckingSavePermission] =
    useState(false);
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false);
  const [isGuestSavePromptOpen, setIsGuestSavePromptOpen] = useState(false);
  const [hasEverOpenedSaveSheet, setHasEverOpenedSaveSheet] = useState(false);
  const [hasEverOpenedGuestSheet, setHasEverOpenedGuestSheet] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingAnalysisSave>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const isSaveButtonRunningRef = useRef(false);

  useEffect(() => {
    if (!isAnalysisResultHydrated || !isGuest) return;
    if (!fetchPendingAnalysisSaveIntent(window.sessionStorage)) return;

    deletePendingAnalysisSaveIntent(window.sessionStorage);
    const frameId = requestAnimationFrame(() => {
      setHasEverOpenedSaveSheet(true);
      setIsSaveSheetOpen(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [isAnalysisResultHydrated, isGuest]);

  const handleSaveButtonClick = async () => {
    if (!isGuest || isSaving || isCheckingSavePermission) return;
    if (isSaveButtonRunningRef.current) return;
    isSaveButtonRunningRef.current = true;

    setSaveError(null);
    setIsCheckingSavePermission(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setHasEverOpenedSaveSheet(true);
        setIsSaveSheetOpen(true);
      } else {
        setHasEverOpenedGuestSheet(true);
        setIsGuestSavePromptOpen(true);
      }
    } catch {
      setSaveError(
        '로그인 상태를 확인하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
      );
    } finally {
      setIsCheckingSavePermission(false);
      isSaveButtonRunningRef.current = false;
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
        setHasEverOpenedGuestSheet(true);
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

  const handleSaveSheetClose = () => {
    setSaveError(null);
    setIsSaveSheetOpen(false);
  };

  const handleGuestSheetClose = () => {
    setIsGuestSavePromptOpen(false);
  };

  const handleGuestSheetConfirm = () => {
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
  };

  const onResumePendingSave = async (storedPendingSave: PendingAnalysisSave) => {
    setPendingSave(storedPendingSave);
    setHasEverOpenedSaveSheet(true);
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
  };

  return {
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
  };
};

export { useResultSave, type UseResultSaveParams };
