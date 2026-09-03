import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useGuardedAction } from './use-guarded-action';

describe('useGuardedAction', () => {
  it('액션을 실행하고 결과를 반환한다', async () => {
    const action = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useGuardedAction(action));

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current[0]();
    });

    expect(action).toHaveBeenCalledOnce();
    expect(returnValue).toBe('ok');
  });

  it('실행 중 중복 호출을 차단한다', async () => {
    let resolve: (v: string) => void;
    const action = vi.fn(
      () => new Promise<string>((r) => { resolve = r; }),
    );
    const { result } = renderHook(() => useGuardedAction(action));

    let first: string | undefined;
    let second: string | undefined;

    await act(async () => {
      const promise1 = result.current[0]();
      second = await result.current[0]();
      resolve!('done');
      first = await promise1;
    });

    expect(action).toHaveBeenCalledOnce();
    expect(first).toBe('done');
    expect(second).toBeUndefined();
  });

  it('isRunning 상태를 올바르게 관리한다', async () => {
    let resolve: (v: string) => void;
    const action = vi.fn(
      () => new Promise<string>((r) => { resolve = r; }),
    );
    const { result } = renderHook(() => useGuardedAction(action));

    expect(result.current[1]).toBe(false);

    let promise: Promise<string | undefined>;
    act(() => {
      promise = result.current[0]();
    });

    expect(result.current[1]).toBe(true);

    await act(async () => {
      resolve!('done');
      await promise!;
    });

    expect(result.current[1]).toBe(false);
  });

  it('액션이 에러를 던져도 잠금을 해제한다', async () => {
    const action = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useGuardedAction(action));

    await act(async () => {
      await result.current[0]().catch(() => {});
    });

    expect(result.current[1]).toBe(false);

    await act(async () => {
      await result.current[0]().catch(() => {});
    });

    expect(action).toHaveBeenCalledTimes(2);
  });
});
