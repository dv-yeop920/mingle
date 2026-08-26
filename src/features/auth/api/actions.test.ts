import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { login, logout, signup } from './actions';

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getUser: mockGetUser,
    },
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 자격증명으로 로그인하면 성공 결과를 반환한다', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const result = await login({
      username: 'testuser',
      password: 'password123!',
    });

    expect(result).toEqual({ success: true, redirectTo: '/' });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'testuser@mingle.local',
      password: 'password123!',
    });
  });

  it('잘못된 자격증명이면 에러를 반환한다', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const result = await login({ username: 'testuser', password: 'wrong' });
    expect(result).toEqual({
      error: '아이디 또는 비밀번호가 올바르지 않습니다',
    });
  });

  it('저장 흐름 로그인은 정확한 결과 경로를 반환한다', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const result = await login(
      { username: 'testuser', password: 'password123!' },
      '/result',
    );

    expect(result).toEqual({ success: true, redirectTo: '/result' });
  });

  it('허용되지 않은 로그인 리다이렉트 경로는 홈으로 대체한다', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const result = await login(
      { username: 'testuser', password: 'password123!' },
      'https://evil.example',
    );

    expect(result).toEqual({ success: true, redirectTo: '/' });
  });

  it('유효하지 않은 입력값이면 에러를 반환한다', async () => {
    const result = await login({ username: '', password: 'password123!' });
    expect(result).toEqual({ error: '입력값이 올바르지 않습니다' });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

describe('signup', () => {
  const validInput = {
    nickname: '테스트',
    username: 'newuser',
    password: 'abc123!',
    confirmPassword: 'abc123!',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 데이터로 회원가입하면 성공 결과를 반환한다', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const result = await signup(validInput);

    expect(result).toEqual({ success: true, redirectTo: '/' });
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'newuser@mingle.local',
      password: 'abc123!',
      options: { data: { username: 'newuser', nickname: '테스트' } },
    });
  });

  it('중복 아이디면 에러를 반환한다', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    const result = await signup(validInput);
    expect(result).toEqual({ error: '이미 사용 중인 아이디입니다' });
  });

  it('저장 흐름 회원가입은 정확한 결과 경로를 반환한다', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const result = await signup(validInput, '/result');

    expect(result).toEqual({ success: true, redirectTo: '/result' });
  });

  it('결과 하위 경로는 회원가입 리다이렉트 대상으로 허용하지 않는다', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const result = await signup(validInput, '/result/pairs');

    expect(result).toEqual({ success: true, redirectTo: '/' });
  });

  it('유효하지 않은 입력값이면 에러를 반환한다', async () => {
    const result = await signup({
      ...validInput,
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result).toEqual({ error: '입력값이 올바르지 않습니다' });
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('인증된 사용자가 로그아웃하면 로그인으로 리다이렉트한다', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-id' } },
    });
    mockSignOut.mockResolvedValue({ error: null });

    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mockSignOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('미인증 사용자면 에러를 반환한다', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await logout();
    expect(result).toEqual({ error: '인증이 필요합니다' });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
