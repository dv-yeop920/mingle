// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { classifyEvents } from './classifier';

afterEach(() => {
  vi.clearAllMocks();
});

const BATCH_WITH_ERROR = {
  batch_id: 'batch-1',
  project_id: 'prj_1',
  events: [
    {
      id: 'evt_1',
      projectId: 'prj_1',
      deploymentId: 'dpl_1',
      timestamp: 1000,
      source: 'lambda',
      level: 'error',
      statusCode: 500,
    },
  ],
};

const BATCH_INFO_ONLY = {
  batch_id: 'batch-2',
  project_id: 'prj_1',
  events: [
    {
      id: 'evt_2',
      projectId: 'prj_1',
      deploymentId: 'dpl_1',
      timestamp: 2000,
      source: 'lambda',
      level: 'info',
    },
  ],
};

const createSupabaseMock = (batches: unknown[]) => {
  const selectChain = {
    select: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: batches, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
  };

  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error: null }),
  };

  const insertChain = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };

  mockFrom.mockImplementation((table: string) => {
    if (table === 'auto_recovery_events') {
      return {
        select: vi.fn().mockReturnValue(selectChain),
        update: vi.fn().mockReturnValue(updateChain),
      };
    }
    if (table === 'auto_recovery_incidents') {
      return {
        select: vi.fn().mockReturnValue(selectChain),
        update: vi.fn().mockReturnValue(updateChain),
        insert: vi.fn().mockReturnValue(insertChain),
      };
    }
    return {};
  });

  return { selectChain, updateChain, insertChain };
};

describe('Event Classifier', () => {
  it('미분류 배치가 없으면 0을 반환한다', async () => {
    createSupabaseMock([]);
    const supabase = { from: mockFrom } as never;
    const result = await classifyEvents(supabase);
    expect(result).toBe(0);
  });

  it('error/fatal 이벤트만 인시던트로 분류한다', async () => {
    createSupabaseMock([BATCH_WITH_ERROR, BATCH_INFO_ONLY]);
    const supabase = { from: mockFrom } as never;
    const result = await classifyEvents(supabase);
    expect(result).toBe(2);
  });

  it('redirect 소스는 무시한다', async () => {
    const batch = {
      batch_id: 'batch-3',
      project_id: 'prj_1',
      events: [
        {
          id: 'evt_3',
          projectId: 'prj_1',
          deploymentId: 'dpl_1',
          timestamp: 3000,
          source: 'redirect',
          level: 'error',
        },
      ],
    };
    createSupabaseMock([batch]);
    const supabase = { from: mockFrom } as never;
    const result = await classifyEvents(supabase);
    expect(result).toBe(1);
  });
});
