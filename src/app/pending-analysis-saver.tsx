'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { createClient } from '@/shared/lib/supabase/client';

import { saveGuestAnalysis } from '@/features/analysis-result';
import { useTestFlowStore } from '@/features/test-flow';

const PendingAnalysisSaver = () => {
  const router = useRouter();
  const isSaving = useRef(false);
  const analysisResult = useTestFlowStore((s) => s.analysisResult);
  const setAnalysisId = useTestFlowStore((s) => s.setAnalysisId);
  const setAnalysisResult = useTestFlowStore((s) => s.setAnalysisResult);

  useEffect(() => {
    if (!analysisResult || isSaving.current) return;

    const save = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      isSaving.current = true;

      const result = await saveGuestAnalysis({
        groupType: analysisResult.groupType,
        customName: analysisResult.customName,
        members: analysisResult.members,
        chemistryScore: analysisResult.chemistryScore,
        tagline: analysisResult.tagline,
        metrics: analysisResult.metrics,
        groupAtmosphere: analysisResult.groupAtmosphere,
        memberRoles: analysisResult.memberRoles,
        pairChemistry: analysisResult.pairChemistry,
        summary: analysisResult.summary,
      });

      if ('data' in result && result.data) {
        const savedId = result.data.id;
        setAnalysisId(savedId);
        setAnalysisResult(null);
        router.replace(`/result?id=${savedId}`);
      }

      isSaving.current = false;
    };

    save();
  }, [analysisResult, setAnalysisId, setAnalysisResult, router]);

  return null;
};

export { PendingAnalysisSaver };
