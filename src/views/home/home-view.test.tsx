import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeView } from './home-view';

vi.mock('./home-reset-effect', () => ({
  HomeResetEffect: () => null,
}));

vi.mock('./home-header-container', () => ({
  HomeHeaderContainer: () => (
    <div>
      <h1>안녕하세요</h1>
      <h1>민지님 👋</h1>
    </div>
  ),
}));

vi.mock('./recent-tests-container', () => ({
  RecentTestsContainer: () => <div>최근 테스트</div>,
}));

describe('HomeView', () => {
  it('HeroCard 영역이 렌더링된다', () => {
    render(<HomeView />);

    expect(screen.getByText('안녕하세요')).toBeInTheDocument();
  });

  it('최근 테스트 섹션이 렌더링된다', () => {
    render(<HomeView />);

    expect(screen.getByText('최근 테스트')).toBeInTheDocument();
  });
});
