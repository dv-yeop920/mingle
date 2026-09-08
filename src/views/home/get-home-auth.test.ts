import { AuthApiError, AuthSessionMissingError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

import { getHomeAuth } from './get-home-auth';

vi.mock('@/shared/lib/supabase/server', () => ({
  getAuthenticatedClient: vi.fn(),
}));

const mockAuth = vi.mocked(getAuthenticatedClient);
const resolveAuth = (
  user: { id: string } | null,
  error: AuthApiError | AuthSessionMissingError | null = null,
) => {
  mockAuth.mockResolvedValue({ user, error } as Awaited<
    ReturnType<typeof getAuthenticatedClient>
  >);
};

beforeEach(() => vi.resetAllMocks());

describe('getHomeAuth', () => {
  it('회원 ID를 전달한다', async () => {
    resolveAuth({ id: 'member-a' });
    await expect(getHomeAuth()).resolves.toEqual({
      userId: 'member-a',
      isError: false,
    });
  });

  it('세션이 없으면 정상 게스트다', async () => {
    resolveAuth(null, new AuthSessionMissingError());
    await expect(getHomeAuth()).resolves.toEqual({
      userId: null,
      isError: false,
    });
  });

  it('만료된 세션은 정상 게스트다', async () => {
    resolveAuth(null, new AuthApiError('expired', 401, 'session_expired'));
    await expect(getHomeAuth()).resolves.toEqual({
      userId: null,
      isError: false,
    });
  });

  it('인증 서비스 장애를 게스트로 숨기지 않는다', async () => {
    resolveAuth(null, new AuthApiError('unavailable', 503, undefined));
    await expect(getHomeAuth()).resolves.toEqual({
      userId: null,
      isError: true,
    });
  });

  it('throw된 인증 장애도 영역 오류로 반환한다', async () => {
    mockAuth.mockRejectedValue(new AuthApiError('unavailable', 503, undefined));
    await expect(getHomeAuth()).resolves.toEqual({
      userId: null,
      isError: true,
    });
  });

  it('프레임워크 제어 흐름이나 일반 예외를 삼키지 않는다', async () => {
    const error = new Error('NEXT_REDIRECT');
    mockAuth.mockRejectedValue(error);
    await expect(getHomeAuth()).rejects.toBe(error);
  });
});
