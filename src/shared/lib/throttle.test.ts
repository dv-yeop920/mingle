import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { throttle } from './throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('첫 호출을 즉시 실행한다 (leading edge)', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    throttled('a');
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('간격 내 추가 호출은 무시하고 마지막 호출을 trailing으로 실행한다', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    throttled('a');
    throttled('b');
    throttled('c');
    expect(fn).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('c');
  });

  it('간격이 지나면 다시 즉시 실행한다', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    throttled('a');
    vi.advanceTimersByTime(300);

    throttled('b');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('b');
  });

  it('cancel로 예약된 trailing 실행을 취소한다', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 300);

    throttled('a');
    throttled('b');
    throttled.cancel();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('a');
  });
});
