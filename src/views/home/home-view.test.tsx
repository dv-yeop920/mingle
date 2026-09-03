import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeView } from './home-view';

vi.mock('./home-reset-effect', () => ({
  HomeResetEffect: () => null,
}));

vi.mock('./home-header', () => ({
  HomeHeader: ({ userId }: { userId: string | null }) => (
    <div>{userId ? `회원 헤더: ${userId}` : '게스트 헤더'}</div>
  ),
}));

vi.mock('./recent-tests-section', () => ({
  RecentTestsSection: ({ userId }: { userId: string }) => (
    <div>최근 테스트: {userId}</div>
  ),
}));

describe('HomeView', () => {
  it('새로운 케미 테스트 CTA를 렌더링한다', () => {
    render(<HomeView userId={null} />);

    expect(
      screen.getByRole('link', {
        name: '새로운 MBTI 그룹 케미 테스트 시작',
      }),
    ).toHaveAttribute('href', '/group-type');
  });

  it('회원이면 최근 테스트 섹션을 렌더링한다', () => {
    render(<HomeView userId="user-id" />);

    expect(screen.getByText('최근 테스트: user-id')).toBeInTheDocument();
  });

  it('게스트면 최근 테스트 섹션을 렌더링하지 않는다', () => {
    render(<HomeView userId={null} />);

    expect(screen.queryByText(/최근 테스트/)).not.toBeInTheDocument();
  });

  it('SEO 안내를 항상 렌더링한다', () => {
    render(<HomeView userId={null} />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'MBTI 그룹 궁합, 무엇을 알려주나요?',
      }),
    ).toBeInTheDocument();
  });
});
