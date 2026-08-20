'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/shared/lib/supabase/server';
import type { Json } from '@/shared/types/database';

type SaveAnalysisParams = {
  groupId: string;
  chemistryScore: number;
  metrics: Json;
  groupAtmosphere: Json;
  memberRoles: Json;
  pairChemistry: Json;
  summary: string;
};

const saveAnalysis = async (params: SaveAnalysisParams) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { data, error } = await supabase
    .from('analyses')
    .insert({
      user_id: user.id,
      group_id: params.groupId,
      chemistry_score: params.chemistryScore,
      metrics: params.metrics,
      group_atmosphere: params.groupAtmosphere,
      member_roles: params.memberRoles,
      pair_chemistry: params.pairChemistry,
      summary: params.summary,
    })
    .select('id')
    .single();

  if (error) {
    return { error: '분석 결과 저장에 실패했습니다' };
  }

  revalidatePath('/history');
  return { data: { id: data.id } };
};

const deleteAnalysis = async (analysisId: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { error } = await supabase
    .from('analyses')
    .delete()
    .eq('id', analysisId);

  if (error) {
    return { error: '분석 결과 삭제에 실패했습니다' };
  }

  revalidatePath('/history');
  return { data: { success: true } };
};

export { deleteAnalysis, saveAnalysis, type SaveAnalysisParams };
