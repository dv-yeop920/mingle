import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ANALYSIS_RESULT_STORAGE_KEY,
  putAnalysisResult,
} from '@/features/test-flow/lib/analysis-result-session';
import {
  fetchPendingAnalysisSaveIntent,
  putPendingAnalysisSaveIntent,
} from '@/features/test-flow/lib/pending-analysis-save-intent-session';
import {
  fetchPendingAnalysisSave,
  putPendingAnalysisSave,
} from '@/features/test-flow/lib/pending-analysis-save-session';
import { useTestFlowStore } from '@/features/test-flow/model/store';
import { createAnalysisResultFixture } from '@/features/test-flow/testing/analysis-result-fixture';

import { AnalysisResultSessionManager } from './analysis-result-session-manager';

let mockPathname = '/result';
let mockSearchParams = new URLSearchParams();
const SAVE_OPERATION_ID = '7dbefb4f-8c4a-4dde-975d-4756047a4706';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe('AnalysisResultSessionManager', () => {
  beforeEach(() => {
    mockPathname = '/result';
    mockSearchParams = new URLSearchParams();
    window.history.replaceState({}, '', '/result');
    sessionStorage.clear();
    act(() => {
      useTestFlowStore.setState({
        analysisId: null,
        analysisResult: null,
        isAnalysisResultHydrated: false,
      });
    });
  });

  it('앱이 시작되면 세션의 분석 결과를 복원한다', async () => {
    const result = createAnalysisResultFixture();
    putAnalysisResult(result, sessionStorage);

    render(<AnalysisResultSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().analysisResult).toEqual(result);
      expect(useTestFlowStore.getState().isAnalysisResultHydrated).toBe(true);
    });
  });

  it('새 분석 결과가 설정되면 즉시 세션에 저장한다', async () => {
    const result = createAnalysisResultFixture();
    render(<AnalysisResultSessionManager />);

    act(() => useTestFlowStore.getState().setAnalysisResult(result));

    await waitFor(() => {
      expect(
        sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY),
      ).not.toBeNull();
    });
  });

  it('분석 결과가 비워지면 세션 결과도 삭제한다', async () => {
    const result = createAnalysisResultFixture();
    putAnalysisResult(result, sessionStorage);
    render(<AnalysisResultSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().analysisResult).toEqual(result);
    });

    act(() => useTestFlowStore.getState().setAnalysisResult(null));

    expect(sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY)).toBeNull();
  });

  it('결과 상세 화면 사이를 이동하면 세션 결과를 유지한다', async () => {
    const result = createAnalysisResultFixture();
    putAnalysisResult(result, sessionStorage);
    const { rerender } = render(<AnalysisResultSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().analysisResult).toEqual(result);
    });

    mockPathname = '/result/pair-detail';
    rerender(<AnalysisResultSessionManager />);

    expect(useTestFlowStore.getState().analysisResult).toEqual(result);
    expect(sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY)).not.toBeNull();
  });

  it('결과 영역을 벗어나면 메모리와 세션 결과를 함께 삭제한다', async () => {
    const result = createAnalysisResultFixture();
    putAnalysisResult(result, sessionStorage);
    putPendingAnalysisSaveIntent(sessionStorage);
    const { rerender } = render(<AnalysisResultSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().analysisResult).toEqual(result);
    });

    mockPathname = '/';
    rerender(<AnalysisResultSessionManager />);

    expect(useTestFlowStore.getState().analysisResult).toBeNull();
    expect(sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY)).toBeNull();
    expect(fetchPendingAnalysisSaveIntent(sessionStorage)).toBe(false);
  });

  it('결과 저장을 위한 회원가입 이동 중에는 세션 결과를 유지한다', async () => {
    const result = createAnalysisResultFixture();
    putAnalysisResult(result, sessionStorage);
    putPendingAnalysisSave(
      { title: '저장할 결과', saveOperationId: SAVE_OPERATION_ID },
      sessionStorage,
    );
    const { rerender } = render(<AnalysisResultSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().analysisResult).toEqual(result);
    });

    mockPathname = '/signup';
    mockSearchParams = new URLSearchParams('redirect=/result');
    window.history.replaceState({}, '', '/signup?redirect=/result');
    rerender(<AnalysisResultSessionManager />);

    expect(useTestFlowStore.getState().analysisResult).toEqual(result);
    expect(sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY)).not.toBeNull();
    expect(fetchPendingAnalysisSave(sessionStorage)?.title).toBe('저장할 결과');
  });

  it('일반 회원가입 화면으로 이동하면 세션 결과를 삭제한다', async () => {
    const result = createAnalysisResultFixture();
    putAnalysisResult(result, sessionStorage);
    putPendingAnalysisSave(
      { title: '삭제할 결과', saveOperationId: SAVE_OPERATION_ID },
      sessionStorage,
    );
    const { rerender } = render(<AnalysisResultSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().analysisResult).toEqual(result);
    });

    mockPathname = '/signup';
    mockSearchParams = new URLSearchParams();
    window.history.replaceState({}, '', '/signup');
    rerender(<AnalysisResultSessionManager />);

    expect(useTestFlowStore.getState().analysisResult).toBeNull();
    expect(sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY)).toBeNull();
    expect(fetchPendingAnalysisSave(sessionStorage)).toBeNull();
  });

  it('결과 밖의 화면에서 새로 시작하면 남아 있던 세션 결과를 삭제한다', () => {
    const result = createAnalysisResultFixture();
    putAnalysisResult(result, sessionStorage);
    mockPathname = '/';

    render(<AnalysisResultSessionManager />);

    expect(useTestFlowStore.getState().analysisResult).toBeNull();
    expect(sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY)).toBeNull();
  });

  it('인증 화면에서 결과가 비워져도 복귀 전에 세션 결과를 복원한다', async () => {
    const result = createAnalysisResultFixture();
    putAnalysisResult(result, sessionStorage);
    const { rerender } = render(<AnalysisResultSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().analysisResult).toEqual(result);
    });

    mockPathname = '/login';
    mockSearchParams = new URLSearchParams('redirect=/result');
    window.history.replaceState({}, '', '/login?redirect=/result');
    rerender(<AnalysisResultSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().isAnalysisResultHydrated).toBe(false);
    });

    act(() => useTestFlowStore.getState().setAnalysisResult(null));

    expect(sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY)).not.toBeNull();

    mockPathname = '/result';
    mockSearchParams = new URLSearchParams();
    window.history.replaceState({}, '', '/result');
    rerender(<AnalysisResultSessionManager />);

    await waitFor(() => {
      expect(useTestFlowStore.getState().analysisResult).toEqual(result);
      expect(useTestFlowStore.getState().isAnalysisResultHydrated).toBe(true);
    });
  });
});
