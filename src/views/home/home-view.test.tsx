import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeView } from './home-view';

vi.mock('./home-reset-effect', () => ({
  HomeResetEffect: () => null,
}));

vi.mock('./home-header-container', () => ({
  HomeHeaderContainer: () => <div>헤더 영역</div>,
}));

vi.mock('./recent-tests-container', () => ({
  RecentTestsContainer: () => <div>최근 테스트 영역</div>,
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

  it('독립적인 헤더와 기록 영역을 조합한다', () => {
    render(<HomeView />);

    expect(screen.getByText('헤더 영역')).toBeInTheDocument();
    expect(screen.getByText('최근 테스트 영역')).toBeInTheDocument();
  });

  it('SEO 안내를 항상 렌더링한다', () => {
    render(<HomeView />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'MBTI 그룹 궁합, 무엇을 알려주나요?',
      }),
    ).toBeInTheDocument();
  });
});
