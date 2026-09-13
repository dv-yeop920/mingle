'use server';

import { createClient } from '@/shared/lib/supabase/server';
import type { Json } from '@/shared/types/database';

const saveCompatibilityAnalysis = async (params: {
  mbtiA: string;
  mbtiB: string;
  nicknameA?: string;
  nicknameB?: string;
  chemistryScore: number;
  result: Json;
}) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { data, error } = await supabase
    .from('compatibility_analyses')
    .insert({
      user_id: user.id,
      mbti_a: params.mbtiA,
      mbti_b: params.mbtiB,
      nickname_a: params.nicknameA ?? null,
      nickname_b: params.nicknameB ?? null,
      chemistry_score: params.chemistryScore,
      result: params.result,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[saveCompatibilityAnalysis] failed', {
      code: error.code,
      message: error.message,
    });
    return { error: '궁합 분석 저장에 실패했습니다' };
  }

  return { data: { id: data.id } };
};

export { saveCompatibilityAnalysis };
