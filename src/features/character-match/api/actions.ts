'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/shared/lib/supabase/server';
import type { Json } from '@/shared/types/database';

const saveCharacterMatch = async (params: {
  mbti: string;
  workId: string;
  workName: string;
  fullResult: Json;
}) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { data, error } = await supabase
    .from('character_matches')
    .upsert(
      {
        user_id: user.id,
        mbti: params.mbti,
        work_id: params.workId,
        work_name: params.workName,
        full_result: params.fullResult,
      },
      { onConflict: 'user_id,mbti,work_id' },
    )
    .select('id')
    .single();

  if (error) {
    console.error('[saveCharacterMatch] failed', {
      code: error.code,
      message: error.message,
    });
    return { error: '캐릭터 매칭 결과 저장에 실패했습니다' };
  }

  revalidatePath('/analysis/character-match');
  return { data: { id: data.id } };
};

export { saveCharacterMatch };
