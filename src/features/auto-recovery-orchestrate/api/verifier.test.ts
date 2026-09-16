// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockGetCheckRuns = vi.fn();
const mockGetWorkflowRuns = vi.fn();
const mockGetWorkflowRunArtifacts = vi.fn();
const mockGetCompareCommits = vi.fn();
const mockReadFile = vi.fn();
const mockGetDefaultBranch = vi.fn();
const mockCreatePullRequest = vi.fn();
const mockMergePullRequest = vi.fn();
const mockDeleteBranch = vi.fn();

vi.mock('./github', () => ({
  createGitHubClient: vi.fn(() => ({
    getDefaultBranch: mockGetDefaultBranch,
    readFile: mockReadFile,
    readDirectory: vi.fn().mockResolvedValue([]),
    searchCode: vi.fn().mockResolvedValue([]),
    createBranch: vi.fn(),
    commitFiles: vi.fn(),
    getCheckRuns: mockGetCheckRuns,
    getCompareCommits: mockGetCompareCommits,
    createPullRequest: mockCreatePullRequest,
    mergePullRequest: mockMergePullRequest,
    deleteBranch: mockDeleteBranch,
    getWorkflowRunArtifacts: mockGetWorkflowRunArtifacts,
    getWorkflowRuns: mockGetWorkflowRuns,
  })),
}));

const mockPerformReview = vi.fn();
vi.mock('./review', () => ({
  performReview: (...args: unknown[]) => mockPerformReview(...args),
}));

const mockGetPreviewDeployment = vi.fn();
vi.mock('./vercel-api', () => ({
  getRuntimeErrors: vi.fn().mockResolvedValue([]),
  getPreviewDeployment: (...args: unknown[]) =>
    mockGetPreviewDeployment(...args),
}));

const mockCheckPreviewHealth = vi.fn();
vi.mock('./preview-health', () => ({
  checkPreviewHealth: (...args: unknown[]) => mockCheckPreviewHealth(...args),
  HEALTH_PATHS: ['/', '/api/health'],
}));

vi.mock('./scope-checker', async () => {
  const actual = await vi.importActual('./scope-checker');
  return actual;
});

import { handleVerifyAttempt, createInitialState } from './verifier';

afterEach(() => {
  vi.clearAllMocks();
});

const BASE_SHA = 'a'.repeat(40);
const CANDIDATE_SHA = 'b'.repeat(40);

const INCIDENT = {
  fingerprint: 'abc123def456',
  category: 'server',
  project_id: 'prj_1',
  environment: 'production',
  first_seen_at: '2026-09-14T00:00:00Z',
  last_seen_at: '2026-09-14T01:00:00Z',
  occurrence_count: 5,
  attempt_count: 0,
  status: 'verifying',
  locked_by: 'worker-1',
  locked_at: '2026-09-14T01:00:00Z',
};

const CONFIG = {
  anthropicApiKey: 'test-key',
  githubToken: 'test-token',
  githubOwner: 'test-owner',
  githubRepo: 'test-repo',
  vercelToken: 'test-vercel-token',
  vercelProjectId: 'prj_vercel_1',
  maxTokens: 4096,
};

const BASE_INPUT = {
  attemptId: 'attempt-1',
  fingerprint: 'abc123def456',
  branchName: 'fix/agent-abc123def456',
  baseSha: BASE_SHA,
  candidateSha: CANDIDATE_SHA,
  attemptCount: 0,
  incident: INCIDENT as never,
  currentState: null,
  createdAt: new Date().toISOString(),
  config: CONFIG,
};

describe('Verifier 상태 머신', () => {
  it('초기 상태는 ci_pending이다', () => {
    const state = createInitialState();
    expect(state.phase).toBe('ci_pending');
  });

  it('CI 체크가 아직 없으면 대기한다', async () => {
    mockGetCheckRuns.mockResolvedValue([]);

    const { result } = await handleVerifyAttempt(BASE_INPUT);
    expect(result.phase).toBe('ci_pending');
    expect(result.advanced).toBe(false);
  });

  it('CI 4개 모두 성공하면 ci_checking으로 전진한다', async () => {
    mockGetCheckRuns.mockResolvedValue([
      { name: 'lint', status: 'completed', conclusion: 'success' },
      { name: 'typecheck', status: 'completed', conclusion: 'success' },
      { name: 'test', status: 'completed', conclusion: 'success' },
      { name: 'build', status: 'completed', conclusion: 'success' },
    ]);

    const { result, state } = await handleVerifyAttempt(BASE_INPUT);
    expect(result.phase).toBe('ci_checking');
    expect(result.advanced).toBe(true);
    expect(state.checks.lint?.isPassed).toBe(true);
  });

  it('CI 하나가 실패하면 stopped로 전이한다', async () => {
    mockGetCheckRuns.mockResolvedValue([
      { name: 'lint', status: 'completed', conclusion: 'failure' },
      { name: 'typecheck', status: 'completed', conclusion: 'success' },
      { name: 'test', status: 'completed', conclusion: 'success' },
      { name: 'build', status: 'completed', conclusion: 'success' },
    ]);

    const { result, state } = await handleVerifyAttempt(BASE_INPUT);
    expect(result.phase).toBe('stopped');
    expect(state.stoppedReason).toBe('ci-check-failed');
  });

  it('타임아웃 시 stopped로 전이한다', async () => {
    const expired = new Date(
      Date.now() - 1_800_001,
    ).toISOString();

    const { result, state } = await handleVerifyAttempt({
      ...BASE_INPUT,
      createdAt: expired,
    });
    expect(result.phase).toBe('stopped');
    expect(state.stoppedReason).toBe('timeout');
  });

  it('이미 merged 상태이면 변경 없이 반환한다', async () => {
    const mergedState = {
      ...createInitialState(),
      phase: 'merged' as const,
    };

    const { result } = await handleVerifyAttempt({
      ...BASE_INPUT,
      currentState: mergedState,
    });
    expect(result.phase).toBe('merged');
    expect(result.advanced).toBe(false);
  });

  it('review_pending에서 scope 위반이면 stopped', async () => {
    const reviewState = {
      ...createInitialState(),
      phase: 'review_pending' as const,
      checks: {
        lint: { commitSha: CANDIDATE_SHA, isPassed: true },
        typeCheck: { commitSha: CANDIDATE_SHA, isPassed: true },
        test: { commitSha: CANDIDATE_SHA, isPassed: true },
        build: { commitSha: CANDIDATE_SHA, isPassed: true },
      },
    };

    mockGetCompareCommits.mockResolvedValue([
      { filename: 'src/shared/lib/supabase/admin.ts', status: 'modified' },
    ]);

    const { result, state } = await handleVerifyAttempt({
      ...BASE_INPUT,
      currentState: reviewState,
    });
    expect(result.phase).toBe('stopped');
    expect(state.stoppedReason).toMatch(/scope-violation/);
  });

  it('preview_pending에서 배포 미완료 시 대기한다', async () => {
    const previewState = {
      ...createInitialState(),
      phase: 'preview_pending' as const,
    };

    mockGetPreviewDeployment.mockResolvedValue(null);

    const { result } = await handleVerifyAttempt({
      ...BASE_INPUT,
      currentState: previewState,
    });
    expect(result.phase).toBe('preview_pending');
    expect(result.advanced).toBe(false);
  });

  it('preview_pending에서 헬스체크 통과하면 merge_ready로 전진', async () => {
    const previewState = {
      ...createInitialState(),
      phase: 'preview_pending' as const,
    };

    mockGetPreviewDeployment.mockResolvedValue({
      id: 'dpl_1',
      url: 'https://preview.vercel.app',
      readyState: 'READY',
      createdAt: Date.now(),
    });
    mockCheckPreviewHealth.mockResolvedValue([
      { path: '/', status: 200, ok: true },
      { path: '/api/health', status: 200, ok: true },
    ]);

    const { result, state } = await handleVerifyAttempt({
      ...BASE_INPUT,
      currentState: previewState,
    });
    expect(result.phase).toBe('merge_ready');
    expect(state.deployId).toBe('dpl_1');
  });
});
