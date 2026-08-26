'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/shared/lib/supabase/server';

import { loginSchema, signupSchema } from '@/features/auth/model/schemas';
import type {
  LoginFormValues,
  SignupFormValues,
} from '@/features/auth/model/schemas';

const convertRedirectToPath = (redirectTo?: string) => {
  return redirectTo === '/result' ? '/result' : '/';
};

const login = async (values: LoginFormValues, redirectTo?: string) => {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: '입력값이 올바르지 않습니다' };
  }

  const { username, password } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@mingle.local`,
    password,
  });

  if (error) {
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다' };
  }

  return { success: true, redirectTo: convertRedirectToPath(redirectTo) };
};

const signup = async (values: SignupFormValues, redirectTo?: string) => {
  const parsed = signupSchema.safeParse(values);
  if (!parsed.success) {
    return { error: '입력값이 올바르지 않습니다' };
  }

  const { nickname, username, password } = parsed.data;
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: `${username}@mingle.local`,
    password,
    options: {
      data: { username, nickname },
    },
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: '이미 사용 중인 아이디입니다' };
    }
    return { error: '회원가입에 실패했습니다' };
  }

  if (!authData.user) {
    return { error: '회원가입에 실패했습니다' };
  }

  return { success: true, redirectTo: convertRedirectToPath(redirectTo) };
};

const logout = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  await supabase.auth.signOut();
  redirect('/login');
};

export { login, logout, signup };
