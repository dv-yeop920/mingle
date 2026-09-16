// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MonitoringDecision } from '@/shared/lib/auto-recovery';

import type { Incident, MonitorState } from '../model/types';

vi.mock('@/shared/lib/auto-recovery', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/auto-recovery')>();
  return {
    ...actual,
    evaluateProductionMonitoring: vi.fn(),
  };
});

vi.mock('./vercel-api', () => ({
  getProductionDeployments: vi.fn(),
  getRuntimeErrors: vi.fn(),
  promoteDeployment: vi.fn(),
}));

vi.mock('./github', () => ({
  createGitHubClient: vi.fn(),
}));

const { evaluateProductionMonitoring } = await import(
  '@/shared/lib/auto-recovery'
);
const { getProductionDeployments, getRuntimeErrors, promoteDeployment } =
  await import('./vercel-api');
const { createGitHubClient } = await import('./github');
const { handleMonitorAttempt, createInitialMonitorState } = await import(
  './monitor'
);

const mockEvaluate = vi.mocked(evaluateProductionMonitoring);
const mockGetDeployments = vi.mocked(getProductionDeployments);
const mockGetErrors = vi.mocked(getRuntimeErrors);
const mockPromote = vi.mocked(promoteDeployment);
const mockCreateGitHub = vi.mocked(createGitHubClient);

const INCIDENT: Incident = {
  fingerprint: 'abc123',
  category: 'server',
  project_id: 'proj-1',
  environment: 'production',
  first_seen_at: '2026-09-15T00:00:00Z',
  last_seen_at: '2026-09-15T00:01:00Z',
  occurrence_count: 3,
  attempt_count: 1,
  status: 'deploying',
  locked_by: null,
  locked_at: null,
};

const CONFIG = {
  vercelToken: 'tok',
  vercelProjectId: 'proj',
  githubToken: 'gh-tok',
  githubOwner: 'owner',
  githubRepo: 'repo',
};

const MERGE_SHA = 'a'.repeat(40);

describe('Monitor — createInitialMonitorState', () => {
  it('초기 상태는 deploy_pending이다', () => {
    const state = createInitialMonitorState();
    expect(state.phase).toBe('deploy_pending');
    expect(state.snapshots).toEqual([]);
    expect(state.deploymentId).toBeNull();
  });
});

describe('Monitor — deploy_pending', () => {
  beforeEach(() => vi.clearAllMocks());

  it('프로덕션 배포를 찾으면 observing으로 전이한다', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-new',
        url: 'https://app.vercel.app',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: MERGE_SHA,
      },
      {
        id: 'dpl-old',
        url: 'https://old.vercel.app',
        readyState: 'READY',
        createdAt: Date.now() - 10000,
        commitSha: 'b'.repeat(40),
      },
    ]);

    const { result, state } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: null,
      createdAt: new Date().toISOString(),
      config: CONFIG,
    });

    expect(result.phase).toBe('observing');
    expect(result.advanced).toBe(true);
    expect(state.deploymentId).toBe('dpl-new');
    expect(state.previousDeploymentId).toBe('dpl-old');
  });

  it('배포가 아직 없으면 대기한다', async () => {
    mockGetDeployments.mockResolvedValue([]);

    const { result } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: null,
      createdAt: new Date().toISOString(),
      config: CONFIG,
    });

    expect(result.phase).toBe('deploy_pending');
    expect(result.advanced).toBe(false);
  });

  it('10분 초과 시 stopped로 전이한다', async () => {
    mockGetDeployments.mockResolvedValue([]);

    const { result, state } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: null,
      createdAt: new Date(Date.now() - 700_000).toISOString(),
      config: CONFIG,
    });

    expect(result.phase).toBe('stopped');
    expect(state.stoppedReason).toBe('deploy-timeout');
  });
});

describe('Monitor — observing', () => {
  beforeEach(() => vi.clearAllMocks());

  const observingState: MonitorState = {
    phase: 'observing',
    deploymentId: 'dpl-new',
    previousDeploymentId: 'dpl-old',
    mergeCommitSha: MERGE_SHA,
    observationStartedAt: new Date(Date.now() - 360_000).toISOString(),
    snapshots: [],
    rollbackDeploymentId: null,
    revertCommitSha: null,
    stoppedReason: null,
    updatedAt: new Date().toISOString(),
  };

  it('정책이 resolved를 반환하면 resolved로 전이한다', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-new',
        url: 'https://app.vercel.app',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: MERGE_SHA,
      },
    ]);
    mockGetErrors.mockResolvedValue([]);
    mockEvaluate.mockReturnValue({
      action: 'resolved',
      reason: 'production-verified',
    } as MonitoringDecision);

    global.fetch = vi.fn().mockResolvedValue({ status: 200 });

    const { result, state } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: observingState,
      createdAt: new Date().toISOString(),
      config: CONFIG,
    });

    expect(result.phase).toBe('resolved');
    expect(state.snapshots).toHaveLength(1);
  });

  it('정책이 rollback을 반환하면 rollback_pending으로 전이한다', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-new',
        url: 'https://app.vercel.app',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: MERGE_SHA,
      },
    ]);
    mockGetErrors.mockResolvedValue([
      {
        message: 'Error',
        stack: '',
        path: '/',
        count: 5,
        firstSeen: '',
        lastSeen: '',
      },
    ]);
    mockEvaluate.mockReturnValue({
      action: 'rollback',
      reason: 'production-regression',
    } as MonitoringDecision);

    global.fetch = vi.fn().mockResolvedValue({ status: 500 });

    const { result } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: observingState,
      createdAt: new Date().toISOString(),
      config: CONFIG,
    });

    expect(result.phase).toBe('rollback_pending');
  });

  it('다른 배포로 교체되면 stopped로 전이한다', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-other',
        url: 'https://other.vercel.app',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: 'c'.repeat(40),
      },
    ]);

    const { result, state } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: observingState,
      createdAt: new Date().toISOString(),
      config: CONFIG,
    });

    expect(result.phase).toBe('stopped');
    expect(state.stoppedReason).toBe('deployment-superseded');
  });
});

describe('Monitor — rollback_pending', () => {
  beforeEach(() => vi.clearAllMocks());

  const rollbackState: MonitorState = {
    phase: 'rollback_pending',
    deploymentId: 'dpl-new',
    previousDeploymentId: 'dpl-old',
    mergeCommitSha: MERGE_SHA,
    observationStartedAt: new Date().toISOString(),
    snapshots: [],
    rollbackDeploymentId: null,
    revertCommitSha: null,
    stoppedReason: null,
    updatedAt: new Date().toISOString(),
  };

  it('롤백 성공 시 rollback_complete로 전이한다', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-new',
        url: 'https://app.vercel.app',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: MERGE_SHA,
      },
    ]);
    mockPromote.mockResolvedValue(true);
    mockCreateGitHub.mockReturnValue({
      revertCommit: vi.fn().mockResolvedValue('d'.repeat(40)),
    } as unknown as ReturnType<typeof createGitHubClient>);

    const { result, state } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: rollbackState,
      createdAt: new Date().toISOString(),
      config: CONFIG,
    });

    expect(result.phase).toBe('rollback_complete');
    expect(state.rollbackDeploymentId).toBe('dpl-old');
    expect(state.revertCommitSha).toBe('d'.repeat(40));
  });

  it('Vercel 롤백 실패 시 stopped로 전이한다', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-new',
        url: 'https://app.vercel.app',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: MERGE_SHA,
      },
    ]);
    mockPromote.mockResolvedValue(false);

    const { result, state } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: rollbackState,
      createdAt: new Date().toISOString(),
      config: CONFIG,
    });

    expect(result.phase).toBe('stopped');
    expect(state.stoppedReason).toBe('vercel-rollback-failed');
  });

  it('previousDeploymentId 없으면 stopped', async () => {
    const noPrevState = { ...rollbackState, previousDeploymentId: null };

    const { result, state } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: noPrevState,
      createdAt: new Date().toISOString(),
      config: CONFIG,
    });

    expect(result.phase).toBe('stopped');
    expect(state.stoppedReason).toBe('no-previous-deployment');
  });
});

describe('Monitor — terminal states', () => {
  it('resolved 상태는 재처리하지 않는다', async () => {
    const resolvedState: MonitorState = {
      phase: 'resolved',
      deploymentId: 'dpl-new',
      previousDeploymentId: null,
      mergeCommitSha: MERGE_SHA,
      observationStartedAt: new Date().toISOString(),
      snapshots: [],
      rollbackDeploymentId: null,
      revertCommitSha: null,
      stoppedReason: null,
      updatedAt: new Date().toISOString(),
    };

    const { result } = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint: 'abc123',
      incident: INCIDENT,
      mergeCommitSha: MERGE_SHA,
      currentState: resolvedState,
      createdAt: new Date().toISOString(),
      config: CONFIG,
    });

    expect(result.advanced).toBe(false);
    expect(result.phase).toBe('resolved');
  });
});
