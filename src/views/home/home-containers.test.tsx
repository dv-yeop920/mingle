import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getHomeAuth } from './get-home-auth';
import { HomeHeaderContainer } from './home-header-container';
import { RecentTestsContainer } from './recent-tests-container';

vi.mock('./get-home-auth', () => ({ getHomeAuth: vi.fn() }));
vi.mock('./home-header', () => ({
  HomeHeader: ({ userId }: { userId: string | null }) => (
    <div>{userId ?? '게스트'}</div>
  ),
}));
vi.mock('./recent-tests-section', () => ({
  RecentTestsSection: ({ userId }: { userId: string }) => (
    <div>기록 {userId}</div>
  ),
}));
vi.mock('./home-auth-error', () => ({
  HomeAuthError: ({ area }: { area: string }) => <div role="alert">{area}</div>,
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('홈 인증 컨테이너', () => {
  it('회원에게 동일한 인증 ID로 헤더와 기록을 표시한다', async () => {
    vi.mocked(getHomeAuth).mockResolvedValue({
      userId: 'member-a',
      isError: false,
    });
    render(
      <>
        {await HomeHeaderContainer()}
        {await RecentTestsContainer()}
      </>,
    );
    expect(screen.getByText('member-a')).toBeInTheDocument();
    expect(screen.getByText('기록 member-a')).toBeInTheDocument();
  });

  it('게스트에게 헤더만 표시하고 기록을 조회하지 않는다', async () => {
    vi.mocked(getHomeAuth).mockResolvedValue({ userId: null, isError: false });
    render(await HomeHeaderContainer());
    expect(screen.getByText('게스트')).toBeInTheDocument();
    expect(await RecentTestsContainer()).toBeNull();
  });

  it('인증 장애는 각 영역의 오류로 표시한다', async () => {
    vi.mocked(getHomeAuth).mockResolvedValue({ userId: null, isError: true });
    render(
      <>
        {await HomeHeaderContainer()}
        {await RecentTestsContainer()}
      </>,
    );
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.queryByText('게스트')).not.toBeInTheDocument();
  });
});
