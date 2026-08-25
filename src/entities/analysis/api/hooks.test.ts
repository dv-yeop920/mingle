import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}));

vi.mock('@/shared/lib/supabase/client', () => ({
  createClient: mocks.createClient,
}));

import { useAnalyses, useAnalysis } from './hooks';

type QueryOptions = {
  queryKey: readonly string[];
  queryFn: () => Promise<unknown[]>;
  enabled?: boolean;
};

describe('useAnalyses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockImplementation((options: QueryOptions) => options);
  });

  it('그룹 필터가 관계뿐 아니라 분석 행 자체에도 적용된다', async () => {
    const data = [{ id: 'friend-analysis' }];
    const filteredQuery = Promise.resolve({ data, error: null });
    const eq = vi.fn().mockReturnValue(filteredQuery);
    const orderedQuery = Object.assign(
      Promise.resolve({ data: [], error: null }),
      { eq },
    );
    const order = vi.fn().mockReturnValue(orderedQuery);
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });

    mocks.createClient.mockReturnValue({ from });

    const queryOptions = useAnalyses('friends') as unknown as QueryOptions;
    const result = await queryOptions.queryFn();

    expect(select).toHaveBeenCalledWith(
      expect.stringContaining('groups!inner'),
    );
    expect(eq).toHaveBeenCalledWith('groups.type', 'friends');
    expect(result).toEqual(data);
  });
});

describe('useAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockImplementation((options: QueryOptions) => options);
  });

  it('분석 ID와 소유권 RLS가 적용되는 관계 데이터를 함께 조회한다', async () => {
    const analysis = { id: 'analysis-id', groups: { members: [] } };
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: analysis, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    mocks.createClient.mockReturnValue({ from });

    const queryOptions = useAnalysis('analysis-id') as unknown as QueryOptions;
    const result = await queryOptions.queryFn();

    expect(from).toHaveBeenCalledWith('analyses');
    expect(select).toHaveBeenCalledWith(
      expect.stringContaining(
        'groups(type, custom_name, members(nickname, mbti, is_self, gender, order))',
      ),
    );
    expect(eq).toHaveBeenCalledWith('id', 'analysis-id');
    expect(maybeSingle).toHaveBeenCalledOnce();
    expect(queryOptions.enabled).toBe(true);
    expect(result).toEqual(analysis);
  });

  it('분석 ID가 없으면 조회하지 않는다', () => {
    const queryOptions = useAnalysis('') as unknown as QueryOptions;

    expect(queryOptions.enabled).toBe(false);
  });

  it('RLS로 숨겨졌거나 존재하지 않는 분석은 null을 반환한다', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    mocks.createClient.mockReturnValue({ from });

    const queryOptions = useAnalysis('unknown-id') as unknown as QueryOptions;

    await expect(queryOptions.queryFn()).resolves.toBeNull();
  });
});
