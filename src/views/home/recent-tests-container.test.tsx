import { render, screen } from '@testing-library/react';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/shared/config/query-keys';

import { RecentTestsContainer } from './recent-tests-container';

type QueryOptions = {
  queryFn: () => unknown;
  queryKey: readonly string[];
};

type DataBoundaryElement = ReactElement<{
  children: ReactElement;
  fallback: ReactNode;
}>;

const mocks = vi.hoisted(() => ({
  dehydrate: vi.fn(() => ({ queries: [] })),
  fetchAnalyses: vi.fn(),
  getAuthenticatedClient: vi.fn(),
  prefetchQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  dehydrate: mocks.dehydrate,
  HydrationBoundary: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/shared/lib/react-query/get-query-client', () => ({
  getQueryClient: () => ({ prefetchQuery: mocks.prefetchQuery }),
}));

vi.mock('@/shared/lib/supabase/server', () => ({
  getAuthenticatedClient: mocks.getAuthenticatedClient,
}));

vi.mock('@/entities/analysis/api/queries', () => ({
  fetchAnalyses: mocks.fetchAnalyses,
}));

vi.mock('./recent-tests-section', () => ({
  RecentTestsSection: () => <div>최근 테스트 목록</div>,
}));

const renderDataBoundary = async (element: DataBoundaryElement) => {
  const dataElement = element.props.children;
  const DataContainer = dataElement.type as () => Promise<ReactNode>;
  const dataTree = await DataContainer();

  render(<>{dataTree}</>);
};

describe('RecentTestsContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prefetchQuery.mockImplementation(async ({ queryFn }: QueryOptions) =>
      queryFn(),
    );
  });

  it('게스트는 최근 테스트를 조회하거나 스켈레톤을 렌더링하지 않는다', async () => {
    mocks.getAuthenticatedClient.mockResolvedValue({ user: null });

    const element = await RecentTestsContainer();
    const { container } = render(<>{element}</>);

    expect(element).toBeNull();
    expect(mocks.prefetchQuery).not.toHaveBeenCalled();
    expect(mocks.fetchAnalyses).not.toHaveBeenCalled();
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('회원은 최근 테스트 조회 경계와 스켈레톤을 선택한다', async () => {
    mocks.getAuthenticatedClient.mockResolvedValue({ user: { id: 'user-id' } });
    mocks.fetchAnalyses.mockResolvedValue([]);

    const element = await RecentTestsContainer();

    expect(isValidElement(element)).toBe(true);

    const dataBoundary = element as DataBoundaryElement;
    const { container } = render(<>{dataBoundary.props.fallback}</>);

    expect(
      container.querySelector('[aria-hidden="true"] .animate-pulse'),
    ).toBeInTheDocument();

    await renderDataBoundary(dataBoundary);

    expect(mocks.prefetchQuery).toHaveBeenCalledOnce();

    const queryOptions = mocks.prefetchQuery.mock.calls[0]?.[0] as QueryOptions;

    expect(queryOptions.queryKey).toEqual(queryKeys.analyses.list());
    expect(mocks.fetchAnalyses).toHaveBeenCalledOnce();
    expect(screen.getByText('최근 테스트 목록')).toBeInTheDocument();
  });
});
