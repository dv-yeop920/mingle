import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateMbti, updateNickname, updatePassword } from './actions';

const mockGetUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpdateUser = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      updateUser: mockUpdateUser,
    },
    from: () => ({
      update: (data: unknown) => {
        mockUpdate(data);
        return { eq: mockEq };
      },
    }),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockAuthUser = {
  data: { user: { id: 'user-1', email: 'test@mingle.local' } },
};
const mockNoUser = { data: { user: null } };

describe('updateNickname', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 닉네임으로 업데이트한다', async () => {
    mockGetUser.mockResolvedValue(mockAuthUser);
    mockEq.mockResolvedValue({ error: null });

    const result = await updateNickname({ nickname: '새닉네임' });

    expect(result).toEqual({ data: { nickname: '새닉네임' } });
    expect(mockUpdate).toHaveBeenCalledWith({ nickname: '새닉네임' });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
    expect(revalidatePath).toHaveBeenCalledWith('/mypage');
  });

  it('미인증 사용자면 에러를 반환한다', async () => {
    mockGetUser.mockResolvedValue(mockNoUser);

    const result = await updateNickname({ nickname: '새닉네임' });
    expect(result).toEqual({ error: '인증이 필요합니다' });
  });

  it('빈 닉네임이면 유효성 에러를 반환한다', async () => {
    const result = await updateNickname({ nickname: '' });
    expect(result).toEqual({ error: '입력값이 올바르지 않습니다' });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('8글자 초과 닉네임이면 유효성 에러를 반환한다', async () => {
    const result = await updateNickname({ nickname: '아홉글자닉네임입니다' });
    expect(result).toEqual({ error: '입력값이 올바르지 않습니다' });
  });
});

describe('updatePassword', () => {
  const validInput = {
    currentPassword: 'old123!',
    newPassword: 'new456!',
    confirmPassword: 'new456!',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 비밀번호로 변경한다', async () => {
    mockGetUser.mockResolvedValue(mockAuthUser);
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });

    const result = await updatePassword(validInput);

    expect(result).toEqual({ data: { success: true } });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@mingle.local',
      password: 'old123!',
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'new456!' });
  });

  it('현재 비밀번호가 틀리면 에러를 반환한다', async () => {
    mockGetUser.mockResolvedValue(mockAuthUser);
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });

    const result = await updatePassword(validInput);
    expect(result).toEqual({ error: '현재 비밀번호가 올바르지 않습니다' });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('미인증 사용자면 에러를 반환한다', async () => {
    mockGetUser.mockResolvedValue(mockNoUser);

    const result = await updatePassword(validInput);
    expect(result).toEqual({ error: '인증이 필요합니다' });
  });

  it('유효하지 않은 비밀번호면 에러를 반환한다', async () => {
    const result = await updatePassword({
      currentPassword: 'old',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result).toEqual({ error: '입력값이 올바르지 않습니다' });
  });
});

describe('updateMbti', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 MBTI로 업데이트한다', async () => {
    mockGetUser.mockResolvedValue(mockAuthUser);
    mockEq.mockResolvedValue({ error: null });

    const result = await updateMbti('ENFP');

    expect(result).toEqual({ data: { mbti: 'ENFP' } });
    expect(mockUpdate).toHaveBeenCalledWith({ mbti: 'ENFP' });
    expect(revalidatePath).toHaveBeenCalledWith('/mypage');
  });

  it('잘못된 MBTI 유형이면 에러를 반환한다', async () => {
    const result = await updateMbti('XXXX');
    expect(result).toEqual({ error: '올바른 MBTI 유형을 선택해주세요' });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('미인증 사용자면 에러를 반환한다', async () => {
    mockGetUser.mockResolvedValue(mockNoUser);

    const result = await updateMbti('ENFP');
    expect(result).toEqual({ error: '인증이 필요합니다' });
  });
});
