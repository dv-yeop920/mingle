'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/shared/lib/supabase/server';

import { nicknameSchema, passwordSchema } from '@/features/profile/model/schemas';
import type { NicknameFormValues, PasswordFormValues } from '@/features/profile/model/schemas';

const VALID_MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

const updateNickname = async (values: NicknameFormValues) => {
  const parsed = nicknameSchema.safeParse(values);
  if (!parsed.success) {
    return { error: '입력값이 올바르지 않습니다' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { nickname } = parsed.data;
  const { error } = await supabase
    .from('profiles')
    .update({ nickname })
    .eq('id', user.id);

  if (error) {
    return { error: '닉네임 변경에 실패했습니다' };
  }

  revalidatePath('/mypage');
  return { data: { nickname } };
};

const updatePassword = async (values: PasswordFormValues) => {
  const parsed = passwordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: '입력값이 올바르지 않습니다' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { currentPassword, newPassword } = parsed.data;

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: '현재 비밀번호가 올바르지 않습니다' };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: '비밀번호 변경에 실패했습니다' };
  }

  return { data: { success: true } };
};

const updateMbti = async (mbti: string) => {
  if (!VALID_MBTI_TYPES.includes(mbti as typeof VALID_MBTI_TYPES[number])) {
    return { error: '올바른 MBTI 유형을 선택해주세요' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ mbti })
    .eq('id', user.id);

  if (error) {
    return { error: 'MBTI 변경에 실패했습니다' };
  }

  revalidatePath('/mypage');
  return { data: { mbti } };
};

export { updateMbti, updateNickname, updatePassword };
