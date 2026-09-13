'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/shared/lib/supabase/server';
import type { Json } from '@/shared/types/database';

const saveMbtiProfile = async (params: {
  mbti: string;
  fullAnalysis: Json;
}) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { data, error } = await supabase
    .from('mbti_profiles')
    .upsert(
      {
        user_id: user.id,
        mbti: params.mbti,
        full_analysis: params.fullAnalysis,
      },
      { onConflict: 'user_id,mbti' },
    )
    .select('id')
    .single();

  if (error) {
    console.error('[saveMbtiProfile] failed', {
      code: error.code,
      message: error.message,
    });
    return { error: 'MBTI 프로필 저장에 실패했습니다' };
  }

  revalidatePath('/analysis/mbti-profile');
  return { data: { id: data.id } };
};

export { saveMbtiProfile };
