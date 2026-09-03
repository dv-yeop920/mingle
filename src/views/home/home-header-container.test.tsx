import { render, screen } from '@testing-library/react';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/shared/config/query-keys';

import { HomeHeaderContainer } from './home-header-container';

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
  fetchProfile: vi.fn(),
  getAuthenticatedClient: vi.fn(),
  prefetchQuery: vi.fn(),
  setQueryData: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  dehydrate: mocks.dehydrate,
  HydrationBoundary: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/shared/lib/react-query/get-query-client', () => ({
  getQueryClient: () => ({
    prefetchQuery: mocks.prefetchQuery,
    setQueryData: mocks.setQueryData,
  }),
}));

vi.mock('@/shared/lib/supabase/server', () => ({
  getAuthenticatedClient: mocks.getAuthenticatedClient,
}));

vi.mock('@/entities/user/api/queries', () => ({
  fetchProfile: mocks.fetchProfile,
}));

vi.mock('./home-header', () => ({
  HomeHeader: () => <div>홈 헤더</div>,
}));

const renderDataBoundary = async (element: DataBoundaryElement) => {
  const dataElement = element.props.children;
  const DataContainer = dataElement.type as () => Promise<ReactNode>;
  const dataTree = await DataContainer();

  render(<>{dataTree}</>);
};

describe('HomeHeaderContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prefetchQuery.mockImplementation(async ({ queryFn }: QueryOptions) =>
      queryFn(),
    );
  });

  it('게스트는 프로필을 조회하지 않고 비로그인 헤더를 렌더링한다', async () => {
    mocks.getAuthenticatedClient.mockResolvedValue({ user: null });

    const element = await HomeHeaderContainer();
    const { container } = render(<>{element}</>);

    expect(screen.getByText('홈 헤더')).toBeInTheDocument();
    expect(mocks.setQueryData).toHaveBeenCalledWith(
      queryKeys.profile.detail(),
      null,
    );
    expect(mocks.prefetchQuery).not.toHaveBeenCalled();
    expect(mocks.fetchProfile).not.toHaveBeenCalled();
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('회원은 프로필 조회 경계와 헤더 스켈레톤을 선택한다', async () => {
    mocks.getAuthenticatedClient.mockResolvedValue({ user: { id: 'user-id' } });
    mocks.fetchProfile.mockResolvedValue({ nickname: '민지' });

    const element = await HomeHeaderContainer();

    expect(isValidElement(element)).toBe(true);

    const dataBoundary = element as DataBoundaryElement;
    const { container } = render(<>{dataBoundary.props.fallback}</>);

    expect(
      container.querySelector('[aria-hidden="true"] .animate-pulse'),
    ).toBeInTheDocument();

    await renderDataBoundary(dataBoundary);

    expect(mocks.prefetchQuery).toHaveBeenCalledWith({
      queryKey: queryKeys.profile.detail(),
      queryFn: mocks.fetchProfile,
    });
    expect(mocks.fetchProfile).toHaveBeenCalledOnce();
    expect(screen.getByText('홈 헤더')).toBeInTheDocument();
  });
});
