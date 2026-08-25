import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchPendingAnalysisSave,
  putPendingAnalysisSave,
  useTestFlowStore,
} from '@/features/test-flow';
import { createAnalysisResultFixture } from '@/features/test-flow/testing/analysis-result-fixture';

import { ResultView } from './result-view';

const { mockGetUser, mockPush, mockReplace, mockSaveGuestAnalysis } =
  vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockPush: vi.fn(),
    mockReplace: vi.fn(),
    mockSaveGuestAnalysis: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

vi.mock('@/shared/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('@/features/analysis-result/api/actions', () => ({
  saveGuestAnalysis: mockSaveGuestAnalysis,
}));

const SAVE_OPERATION_ID = '7dbefb4f-8c4a-4dde-975d-4756047a4706';

const renderResultView = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ResultView />
    </QueryClientProvider>,
  );
};

const submitTitle = async (title: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '결과 저장하기' }));
  await user.type(screen.getByLabelText('테스트 제목'), title);
  await user.click(screen.getByRole('button', { name: '완료' }));
};

describe('ResultView save flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    act(() => {
      useTestFlowStore.setState({
        analysisId: null,
        analysisResult: createAnalysisResultFixture(),
        isAnalysisResultHydrated: true,
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('저장 요청이 예외를 던져도 로딩을 해제하고 재시도 오류를 보여준다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSaveGuestAnalysis.mockRejectedValue(new Error('network'));
    renderResultView();

    await submitTitle('여름 여행 멤버');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '결과를 저장하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
    );
    expect(screen.getByRole('button', { name: '완료' })).toBeEnabled();
    const pendingSave = fetchPendingAnalysisSave(sessionStorage);
    expect(pendingSave?.title).toBe('여름 여행 멤버');

    mockSaveGuestAnalysis.mockResolvedValue({ data: { id: 'analysis-1' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '완료' }));

    await waitFor(() => {
      expect(mockSaveGuestAnalysis).toHaveBeenCalledTimes(2);
    });
    expect(mockSaveGuestAnalysis.mock.calls[1]?.[0].saveOperationId).toBe(
      pendingSave?.saveOperationId,
    );
  });

  it('비로그인 사용자의 제목을 보존하고 redirect가 있는 회원가입으로 이동한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    renderResultView();

    await submitTitle('우리 팀 첫 케미');

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/signup?redirect=/result');
    });
    const pendingSave = fetchPendingAnalysisSave(sessionStorage);
    expect(pendingSave?.title).toBe('우리 팀 첫 케미');
    expect(pendingSave?.saveOperationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(mockSaveGuestAnalysis).not.toHaveBeenCalled();
  });

  it('인증 후 결과로 돌아오면 보존한 제목으로 자동 저장한다', async () => {
    putPendingAnalysisSave(
      {
        title: '복귀 후 자동 저장',
        saveOperationId: SAVE_OPERATION_ID,
      },
      sessionStorage,
    );
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSaveGuestAnalysis.mockResolvedValue({ data: { id: 'analysis-1' } });

    renderResultView();

    await waitFor(() => {
      expect(mockSaveGuestAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '복귀 후 자동 저장',
          saveOperationId: SAVE_OPERATION_ID,
        }),
      );
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
    expect(fetchPendingAnalysisSave(sessionStorage)).toBeNull();
  });

  it('복귀 후 자동 저장이 실패하면 제목을 채운 바텀시트에서 재시도할 수 있다', async () => {
    putPendingAnalysisSave(
      {
        title: '다시 저장할 제목',
        saveOperationId: SAVE_OPERATION_ID,
      },
      sessionStorage,
    );
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSaveGuestAnalysis.mockResolvedValue({ error: '서버 저장 실패' });

    renderResultView();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '서버 저장 실패',
    );
    expect(screen.getByLabelText('테스트 제목')).toHaveValue(
      '다시 저장할 제목',
    );
    expect(screen.getByRole('button', { name: '완료' })).toBeEnabled();
    expect(mockSaveGuestAnalysis).toHaveBeenCalledTimes(1);
    expect(fetchPendingAnalysisSave(sessionStorage)).toEqual({
      title: '다시 저장할 제목',
      saveOperationId: SAVE_OPERATION_ID,
    });
  });

  it('비로그인 상태로 pending 결과에 복귀하면 자동 저장이나 재이동 없이 제목만 보여준다', async () => {
    putPendingAnalysisSave(
      {
        title: '로그인 후 저장할 제목',
        saveOperationId: SAVE_OPERATION_ID,
      },
      sessionStorage,
    );
    mockGetUser.mockResolvedValue({ data: { user: null } });

    renderResultView();

    expect(await screen.findByLabelText('테스트 제목')).toHaveValue(
      '로그인 후 저장할 제목',
    );
    expect(mockSaveGuestAnalysis).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('로그인 상태에서는 세션 저장이 실패해도 RPC 저장을 진행한다', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSaveGuestAnalysis.mockResolvedValue({ data: { id: 'analysis-1' } });
    renderResultView();

    await submitTitle('세션 없이 저장');

    await waitFor(() => {
      expect(mockSaveGuestAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '세션 없이 저장',
          saveOperationId: expect.any(String),
        }),
      );
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
