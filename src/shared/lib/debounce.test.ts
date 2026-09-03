import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('지정한 시간이 지난 후 함수를 실행한다', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('연속 호출 시 마지막 호출만 실행한다', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('a');
    debounced('b');
    debounced('c');

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('cancel로 예약된 실행을 취소한다', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced.cancel();

    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
  });

  it('flush로 예약된 실행을 즉시 실행한다', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('x');
    debounced.flush();

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('x');

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('예약 없이 flush를 호출하면 아무 일도 일어나지 않는다', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced.flush();
    expect(fn).not.toHaveBeenCalled();
  });
});
