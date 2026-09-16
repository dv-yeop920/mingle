// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockUpsert = vi.fn();
vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({ upsert: mockUpsert })),
  })),
}));

import { createCollectorEnqueue } from './collector';

afterEach(() => {
  vi.clearAllMocks();
});

const BATCH = {
  batchId: 'abc123',
  events: [
    {
      id: 'evt_1',
      projectId: 'prj_1',
      deploymentId: 'dpl_1',
      timestamp: 1000,
      source: 'lambda' as const,
      level: 'error' as const,
    },
  ],
};

describe('Collector 내부 모듈', () => {
  it('배치를 Supabase에 upsert한다', async () => {
    mockUpsert.mockResolvedValue({ error: null });
    const enqueue = createCollectorEnqueue();
    await enqueue(BATCH);
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        batch_id: 'abc123',
        project_id: 'prj_1',
        events: BATCH.events,
      },
      { onConflict: 'batch_id', ignoreDuplicates: true },
    );
  });

  it('중복 배치는 ignoreDuplicates로 무시한다', async () => {
    mockUpsert.mockResolvedValue({ error: null });
    const enqueue = createCollectorEnqueue();
    await enqueue(BATCH);
    await enqueue(BATCH);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    const options = mockUpsert.mock.calls[0][1];
    expect(options.ignoreDuplicates).toBe(true);
  });

  it('Supabase 에러 시 throw한다', async () => {
    mockUpsert.mockResolvedValue({
      error: { message: 'insert failed', code: '23505' },
    });
    const enqueue = createCollectorEnqueue();
    await expect(enqueue(BATCH)).rejects.toEqual(
      expect.objectContaining({ message: 'insert failed' }),
    );
  });
});
