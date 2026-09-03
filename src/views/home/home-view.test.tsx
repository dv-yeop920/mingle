import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeView } from './home-view';

const containerState = vi.hoisted(() => ({
  isSuspended: false,
  pendingPromise: new Promise<never>(() => undefined),
}));

vi.mock('./home-reset-effect', () => ({
  HomeResetEffect: () => null,
}));

vi.mock('./home-header-container', () => ({
  HomeHeaderContainer: () => {
    if (containerState.isSuspended) {
      throw containerState.pendingPromise;
    }

    return <div>안녕하세요</div>;
  },
}));

vi.mock('./recent-tests-container', () => ({
  RecentTestsContainer: () => {
    if (containerState.isSuspended) {
      throw containerState.pendingPromise;
    }

    return <div>최근 테스트</div>;
  },
}));

describe('HomeView', () => {
  beforeEach(() => {
    containerState.isSuspended = false;
  });

  it('새로운 케미 테스트 CTA를 렌더링한다', () => {
    render(<HomeView />);

    expect(
      screen.getByRole('link', {
        name: '새로운 MBTI 그룹 케미 테스트 시작',
      }),
    ).toHaveAttribute('href', '/group-type');
  });

  it('최근 테스트 섹션이 렌더링된다', () => {
    render(<HomeView />);

    expect(screen.getByText('최근 테스트')).toBeInTheDocument();
  });

  it('개인화 영역이 로딩 중이어도 SEO 안내를 렌더링한다', () => {
    containerState.isSuspended = true;

    render(<HomeView />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'MBTI 그룹 궁합, 무엇을 알려주나요?',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: '새로운 MBTI 그룹 케미 테스트 시작',
      }),
    ).toBeInTheDocument();
  });
});
