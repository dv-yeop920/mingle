import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchPendingAnalysisSave,
  fetchPendingAnalysisSaveIntent,
  putPendingAnalysisSave,
  putPendingAnalysisSaveIntent,
  useTestFlowStore,
} from '@/features/test-flow';
import { createAnalysisResultFixture } from '@/features/test-flow/testing/analysis-result-fixture';

import { ResultView } from './result-view';

const {
  mockBack,
  mockGetUser,
  mockPush,
  mockReplace,
  mockSaveGuestAnalysis,
  mockUseAnalysis,
} = vi.hoisted(() => ({
    mockBack: vi.fn(),
    mockGetUser: vi.fn(),
    mockPush: vi.fn(),
    mockReplace: vi.fn(),
    mockSaveGuestAnalysis: vi.fn(),
    mockUseAnalysis: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
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

vi.mock('@/entities/analysis', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/analysis')>()),
  useAnalysis: mockUseAnalysis,
}));

const SAVE_OPERATION_ID = '7dbefb4f-8c4a-4dde-975d-4756047a4706';

const renderResultView = (analysisId?: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ResultView analysisId={analysisId} />
    </QueryClientProvider>,
  );
};

const submitTitle = async (title: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '결과 저장하기' }));
  await screen.findByRole('dialog', { name: '테스트 제목 정하기' });
  await user.type(screen.getByLabelText('테스트 제목'), title);
  await user.click(screen.getByRole('button', { name: '완료' }));
};

describe('ResultView save flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseAnalysis.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    });
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

  it('인증 복귀 결과를 복원하는 동안 로딩 문구 없이 프레임을 유지하고 복원 결과를 보여준다', () => {
    const restoredResult = createAnalysisResultFixture();
    act(() => {
      useTestFlowStore.setState({
        analysisId: null,
        analysisResult: null,
        isAnalysisResultHydrated: false,
      });
    });

    renderResultView();

    expect(
      screen.getByRole('status', { name: '결과를 불러오는 중' }),
    ).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.queryByText('결과를 불러오는 중...'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('분석 결과를 찾을 수 없습니다'),
    ).not.toBeInTheDocument();

    act(() => {
      useTestFlowStore.setState({
        analysisResult: restoredResult,
        isAnalysisResultHydrated: true,
      });
    });

    expect(
      screen.getByText('다정하게 균형을 맞추는 모임'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: '결과를 불러오는 중' }),
    ).not.toBeInTheDocument();
  });

  it('저장된 결과를 조회하는 동안에도 로딩 문구를 노출하지 않는다', () => {
    mockUseAnalysis.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
    });

    renderResultView('analysis-1');

    expect(
      screen.getByRole('status', { name: '결과를 불러오는 중' }),
    ).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.queryByText('결과를 불러오는 중...'),
    ).not.toBeInTheDocument();
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

  it('비로그인 사용자는 제목 입력 전에 안내를 확인한 후 회원가입으로 이동한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    renderResultView();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '결과 저장하기' }));

    expect(
      await screen.findByText('회원가입을 하면 기록을 저장할 수 있어요'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: '테스트 제목 정하기' }),
    ).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalledWith('/signup?redirect=/result');
    expect(mockSaveGuestAnalysis).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '회원가입하기' }));

    expect(mockPush).toHaveBeenCalledWith('/signup?redirect=/result');
    expect(fetchPendingAnalysisSaveIntent(sessionStorage)).toBe(true);
  });

  it('비로그인 저장 안내를 취소하면 결과 화면에 머문다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    renderResultView();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '결과 저장하기' }));
    await user.click(await screen.findByRole('button', { name: '취소' }));

    expect(mockPush).not.toHaveBeenCalledWith('/signup?redirect=/result');
    expect(
      screen.queryByRole('dialog', { name: '기록을 저장하려면' }),
    ).not.toBeInTheDocument();
    expect(fetchPendingAnalysisSaveIntent(sessionStorage)).toBe(false);
  });

  it('회원가입 후 결과로 돌아오면 제목 입력을 자동으로 연다', async () => {
    putPendingAnalysisSaveIntent(sessionStorage);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    renderResultView();

    expect(
      await screen.findByRole('dialog', { name: '테스트 제목 정하기' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('테스트 제목')).toBeInTheDocument();
    expect(fetchPendingAnalysisSaveIntent(sessionStorage)).toBe(false);
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

  it('저장된 분석을 DB 데이터로 렌더링하고 이전 목록으로 돌아간다', async () => {
    mockUseAnalysis.mockReturnValue({
      data: {
        id: 'analysis-1',
        chemistry_score: 87,
        tagline: '서로의 리듬을 살려주는 팀',
        summary: '다른 관점이 자연스럽게 균형을 만들어요.',
        metrics: { conversation: 82, teamwork: 91 },
        group_atmosphere: {
          description: '대화가 편안하게 이어져요.',
          decision_making: '충분히 이야기하고 결정해요.',
          conflict: '속도 차이를 살피면 좋아요.',
          best_moment: '함께 계획을 완성할 때 빛나요.',
        },
        member_roles: [
          {
            nickname: '민지',
            mbti: 'ENFP',
            role: '분위기 메이커',
            description: '대화에 활기를 더해요.',
          },
        ],
        pair_chemistry: [],
        groups: {
          type: 'friends',
          members: [
            { nickname: '민지', mbti: 'ENFP', is_self: true },
            { nickname: '하니', mbti: 'ISTJ', is_self: false },
          ],
        },
      },
      isError: false,
      isLoading: false,
    });
    renderResultView('analysis-1');

    expect(
      screen.getByText('서로의 리듬을 살려주는 팀'),
    ).toBeInTheDocument();
    expect(screen.getByText('대화 케미')).toBeInTheDocument();
    expect(screen.getByText('저장된 결과입니다')).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '이전 화면으로' }));

    expect(mockBack).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalledWith('/');
  });

  it('저장된 분석 조회가 실패하면 오류 안내를 보여준다', () => {
    mockUseAnalysis.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    });
    renderResultView('analysis-1');

    expect(
      screen.getByText(
        '결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      ),
    ).toBeInTheDocument();
  });
});
