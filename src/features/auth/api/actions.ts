'use server';

import { createAdminClient } from '@/shared/lib/supabase/admin';
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

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: '로그아웃에 실패했습니다' };
  }

  return { data: { success: true } };
};

const deleteAccount = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const admin = createAdminClient();
  const userId = user.id;

  const { data: groups, error: groupsError } = await admin
    .from('groups')
    .select('id')
    .eq('user_id', userId);

  if (groupsError) {
    return { error: '회원탈퇴에 실패했습니다' };
  }

  const groupIds = groups?.map((g) => g.id) ?? [];

  if (groupIds.length > 0) {
    const { error } = await admin
      .from('members')
      .delete()
      .in('group_id', groupIds);

    if (error) {
      return { error: '회원탈퇴에 실패했습니다' };
    }
  }

  const { error: analysesError } = await admin
    .from('analyses')
    .delete()
    .eq('user_id', userId);

  if (analysesError) {
    return { error: '회원탈퇴에 실패했습니다' };
  }

  const { error: groupsDeleteError } = await admin
    .from('groups')
    .delete()
    .eq('user_id', userId);

  if (groupsDeleteError) {
    return { error: '회원탈퇴에 실패했습니다' };
  }

  const { error: profileError } = await admin
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    return { error: '회원탈퇴에 실패했습니다' };
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);

  if (deleteUserError) {
    return { error: '회원탈퇴에 실패했습니다' };
  }

  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    return { error: '회원탈퇴에 실패했습니다' };
  }

  return { data: { success: true } };
};

export { deleteAccount, login, logout, signup };
