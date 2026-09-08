import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomeHeader } from './home-header';
import { RecentTestsSection } from './recent-tests-section';

const { fetchProfile, fetchAnalyses } = vi.hoisted(() => ({
  fetchProfile: vi.fn(),
  fetchAnalyses: vi.fn(),
}));
vi.mock('@/entities/user', () => ({
  profileQueryOptions: (userId: string) => ({
    queryKey: ['profile', userId],
    queryFn: fetchProfile,
  }),
}));
vi.mock('@/entities/analysis', () => ({
  analysesQueryOptions: (userId: string) => ({
    queryKey: ['analyses', userId],
    queryFn: fetchAnalyses,
  }),
}));
vi.mock('@/features/home', () => ({
  RecentTests: ({ analyses }: { analyses: { id: string }[] }) => (
    <div>{analyses.map((analysis) => analysis.id).join(',')}</div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('홈 회원 캐시', () => {
  it('백그라운드 조회가 실패해도 캐시된 닉네임과 기록을 유지한다', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(['profile', 'member-a'], {
      nickname: '기존닉네임',
      mbti: 'INTJ',
    });
    client.setQueryData(['analyses', 'member-a'], [{ id: '기존기록' }]);
    fetchProfile.mockRejectedValue(new Error('offline'));
    fetchAnalyses.mockRejectedValue(new Error('offline'));
    try {
      const { container } = render(
        <QueryClientProvider client={client}>
          <HomeHeader userId="member-a" />
          <RecentTestsSection userId="member-a" />
        </QueryClientProvider>,
      );
      expect(
        screen.getByRole('heading', { name: /기존닉네임님/ }),
      ).toBeInTheDocument();
      expect(screen.getByText('기존기록')).toBeInTheDocument();
      expect(container.querySelector('[aria-busy="true"]')).toBeNull();
      await waitFor(() => {
        expect(client.getQueryState(['profile', 'member-a'])?.status).toBe(
          'error',
        );
        expect(client.getQueryState(['analyses', 'member-a'])?.status).toBe(
          'error',
        );
      });
      expect(
        screen.getByRole('heading', { name: /기존닉네임님/ }),
      ).toBeInTheDocument();
      expect(screen.getByText('기존기록')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      client.clear();
    }
  });
});
