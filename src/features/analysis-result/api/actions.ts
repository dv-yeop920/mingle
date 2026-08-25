'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/shared/lib/supabase/server';
import type { Json } from '@/shared/types/database';
import type { Gender } from '@/shared/types/gender';

import { convertGroupTypeForStorage } from '../lib/convert-group-type-for-storage';
import { analysisTitleSchema, saveOperationIdSchema } from '../model/schemas';

type SaveAnalysisParams = {
  title: string;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const titleResult = analysisTitleSchema.safeParse({ title: params.title });

  if (!titleResult.success) {
    return {
      error:
        titleResult.error.issues[0]?.message ?? '테스트 제목을 확인해 주세요.',
    };
  }

  const { data, error } = await supabase
    .from('analyses')
    .insert({
      title: titleResult.data.title,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

type SaveGuestAnalysisParams = {
  title: string;
  saveOperationId: string;
  groupType: string;
  customName: string | null;
  members: {
    nickname: string;
    mbti: string;
    gender: Gender;
    is_self: boolean;
  }[];
  chemistryScore: number;
  tagline: string;
  metrics: Json;
  groupAtmosphere: Json;
  memberRoles: Json;
  pairChemistry: Json;
  summary: string;
};

const logSaveError = (error: { code?: string; message?: string }) => {
  console.error('[saveGuestAnalysis] transaction failed', {
    code: error.code,
    message: error.message,
  });
};

const saveGuestAnalysis = async (params: SaveGuestAnalysisParams) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const titleResult = analysisTitleSchema.safeParse({ title: params.title });

  if (!titleResult.success) {
    return {
      error:
        titleResult.error.issues[0]?.message ?? '테스트 제목을 확인해 주세요.',
    };
  }

  const operationIdResult = saveOperationIdSchema.safeParse(
    params.saveOperationId,
  );

  if (!operationIdResult.success) {
    return {
      error:
        operationIdResult.error.issues[0]?.message ??
        '저장 요청 정보가 올바르지 않아요.',
    };
  }

  const { data, error } = await supabase.rpc('save_guest_analysis', {
    p_title: titleResult.data.title,
    p_group_type: convertGroupTypeForStorage(params.groupType),
    p_custom_name: params.customName,
    p_members: params.members,
    p_chemistry_score: params.chemistryScore,
    p_tagline: params.tagline,
    p_metrics: params.metrics,
    p_group_atmosphere: params.groupAtmosphere,
    p_member_roles: params.memberRoles,
    p_pair_chemistry: params.pairChemistry,
    p_summary: params.summary,
    p_save_operation_id: operationIdResult.data,
  });

  if (error || !data) {
    if (error) logSaveError(error);
    return {
      error: '분석 결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
    };
  }

  revalidatePath('/history');
  return { data: { id: data } };
};

export {
  deleteAnalysis,
  saveAnalysis,
  saveGuestAnalysis,
  type SaveAnalysisParams,
  type SaveGuestAnalysisParams,
};
