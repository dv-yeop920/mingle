import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SplashOverlay } from './splash-overlay';

const STORAGE_KEY = 'mingle:splash-shown';

describe('SplashOverlay', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('첫 방문 시 오버레이를 표시한다', () => {
    render(<SplashOverlay />);

    expect(screen.getByText('MIXTI')).toBeInTheDocument();
    expect(screen.getByText('MBTI로 알아보는 우리 사이의 케미')).toBeInTheDocument();
  });

  it('2초 후 페이드아웃을 시작한다', () => {
    render(<SplashOverlay />);

    const overlay = screen.getByText('MIXTI').closest('div[class*="fixed"]')!;
    expect(overlay.className).not.toContain('opacity-0');

    act(() => vi.advanceTimersByTime(2000));

    expect(overlay.className).toContain('opacity-0');
  });

  it('트랜지션 완료 후 DOM에서 제거되고 sessionStorage에 기록한다', () => {
    render(<SplashOverlay />);

    act(() => vi.advanceTimersByTime(2000));

    const overlay = screen.getByText('MIXTI').closest('div[class*="fixed"]')!;
    act(() => {
      overlay.dispatchEvent(new Event('transitionend', { bubbles: true }));
    });

    expect(screen.queryByText('MIXTI')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('재방문 시 오버레이를 표시하지 않는다', () => {
    sessionStorage.setItem(STORAGE_KEY, '1');

    render(<SplashOverlay />);

    expect(screen.queryByText('MIXTI')).not.toBeInTheDocument();
  });
});
