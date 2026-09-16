import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeView } from './home-view';

vi.mock('./home-reset-effect', () => ({
  HomeResetEffect: () => null,
}));

vi.mock('@/shared/lib/supabase/use-auth-user-id', () => ({
  useAuthUserId: () => ({ userId: null, isPending: false }),
}));

vi.mock('./home-recent-tests', () => ({
  HomeRecentTests: () => (
    <section aria-labelledby="recent-tests-title">
      <h2 id="recent-tests-title">최근 테스트</h2>
    </section>
  ),
}));

describe('HomeView', () => {
  it('새로운 케미 테스트 CTA를 렌더링한다', () => {
    render(<HomeView />);

    expect(
      screen.getByRole('link', {
        name: '새로운 MBTI 그룹 케미 테스트 시작',
      }),
    ).toHaveAttribute('href', '/group-type');
  });

  it('인사말은 제목으로 만들지 않고 Hero 제목 하나만 제공한다', () => {
    render(<HomeView />);

    expect(screen.getByText(/안녕하세요/)).toBeInTheDocument();
    expect(screen.getByText('최근 테스트')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /MBTI로 알아보는 우리 그룹 케미/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /안녕하세요/ }),
    ).not.toBeInTheDocument();
  });

  it('SEO 안내를 항상 렌더링한다', () => {
    render(<HomeView />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'MBTI 그룹 궁합, 무엇을 알려주나요?',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /더 많은 MBTI 분석 보기/ }),
    ).toHaveAttribute('href', '/analysis');
  });

  it('공개 SEO 안내를 개인화된 최근 테스트보다 먼저 제공한다', () => {
    render(<HomeView />);

    const seoIntro = screen
      .getByRole('heading', {
        level: 2,
        name: 'MBTI 그룹 궁합, 무엇을 알려주나요?',
      })
      .closest('section');
    const recentTests = screen
      .getByRole('heading', { level: 2, name: '최근 테스트' })
      .closest('section');

    expect(seoIntro).not.toBeNull();
    expect(recentTests).not.toBeNull();
    expect(
      (seoIntro as HTMLElement).compareDocumentPosition(
        recentTests as HTMLElement,
      ) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
