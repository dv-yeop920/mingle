// @vitest-environment node
/**
 * E2E 파이프라인 통합 테스트
 * 에러 발생 → Drain → 분류 → 오케스트레이션 → 검증 → 모니터링
 * 각 Stage의 출력이 다음 Stage의 입력으로 올바르게 연결되는지 검증
 */
import { createHmac } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createIncidentIdentity,
  type MonitoringDecision,
} from '@/shared/lib/auto-recovery';

import type {
  Incident,
  MonitorState,
  VerifyState,
} from '../model/types';

// ── Mocks ──────────────────────────────────────────────────

vi.mock('./vercel-api', () => ({
  getRuntimeErrors: vi.fn(),
  getPreviewDeployment: vi.fn(),
  getProductionDeployments: vi.fn(),
  promoteDeployment: vi.fn(),
}));

vi.mock('./github', () => ({
  createGitHubClient: vi.fn(),
}));

vi.mock('@/shared/lib/auto-recovery', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/auto-recovery')>();
  return {
    ...actual,
    evaluateProductionMonitoring: vi.fn(),
  };
});

const { handleDrainRequest } = await import(
  '@/features/auto-recovery-ingest/api/drain'
);
const { handleVerifyAttempt } = await import('./verifier');
const { handleMonitorAttempt } = await import('./monitor');
const { evaluateProductionMonitoring, createIncidentIdentity: realCreateIdentity } = await import(
  '@/shared/lib/auto-recovery'
);
const {
  getRuntimeErrors,
  getPreviewDeployment,
  getProductionDeployments,
  promoteDeployment,
} = await import('./vercel-api');
const { createGitHubClient } = await import('./github');

const mockEvaluateMonitoring = vi.mocked(evaluateProductionMonitoring);
const mockGetErrors = vi.mocked(getRuntimeErrors);
const mockGetPreview = vi.mocked(getPreviewDeployment);
const mockGetDeployments = vi.mocked(getProductionDeployments);
const mockPromote = vi.mocked(promoteDeployment);
const mockCreateGitHub = vi.mocked(createGitHubClient);

// ── Helpers ────────────────────────────────────────────────

const DRAIN_SECRET = 'test-drain-secret';
const PROJECT_ID = 'prj_test123';
const MERGE_SHA = 'a'.repeat(40);

const createDrainPayload = () => [
  {
    id: 'evt_001',
    projectId: PROJECT_ID,
    deploymentId: 'dpl_abc',
    timestamp: Date.now(),
    source: 'lambda',
    level: 'error',
    statusCode: 500,
  },
  {
    id: 'evt_002',
    projectId: PROJECT_ID,
    deploymentId: 'dpl_abc',
    timestamp: Date.now() + 100,
    source: 'lambda',
    level: 'fatal',
    statusCode: 500,
  },
];

const signPayload = (body: string) =>
  createHmac('sha1', DRAIN_SECRET).update(body).digest('hex');

const makeDrainRequest = (payload: unknown[]) => {
  const body = JSON.stringify(payload);
  return new Request('https://app.test/api/auto-recovery/drain', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-vercel-signature': signPayload(body),
    },
    body,
  });
};

// ── Tests ──────────────────────────────────────────────────

describe('E2E Pipeline — 전체 파이프라인 데이터 흐름 검증', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
  });

  it('Stage 1→2: Drain이 수신한 이벤트가 classifier 입력 형식과 일치한다', async () => {
    const drainPayload = createDrainPayload();
    let capturedEvents: unknown[] = [];

    const resp = await handleDrainRequest(
      makeDrainRequest(drainPayload),
      { signatureSecret: DRAIN_SECRET, projectIds: [PROJECT_ID] },
      async (batch) => {
        capturedEvents = batch.events;
      },
    );

    expect(resp.status).toBe(202);
    expect(capturedEvents).toHaveLength(2);

    // classifier가 기대하는 EventRecord 형식 검증
    for (const event of capturedEvents as Record<string, unknown>[]) {
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('projectId');
      expect(event).toHaveProperty('deploymentId');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('source');
      expect(event).toHaveProperty('level');
    }
  });

  it('Stage 2→3: classifier 출력(fingerprint)이 orchestrator 입력과 일치한다', () => {
    // classifier가 생성하는 fingerprint가 유효한지 직접 검증
    const identity = realCreateIdentity({
      category: 'server',
      projectId: PROJECT_ID,
      environment: 'production',
      releaseId: 'dpl_abc',
      signatureId: 'lambda-error-500',
    });

    expect(identity).not.toBeNull();
    expect(identity!.fingerprint).toBeTruthy();
    expect(typeof identity!.fingerprint).toBe('string');

    // orchestrator는 이 fingerprint로 incidents 테이블에서 조회하고
    // executeFix에 incident 객체를 전달한다
    const incident: Incident = {
      fingerprint: identity!.fingerprint,
      category: 'server',
      project_id: PROJECT_ID,
      environment: 'production',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      occurrence_count: 2,
      attempt_count: 0,
      status: 'detected',
      locked_by: null,
      locked_at: null,
    };

    // executeFix에 필요한 필드가 모두 있는지 확인
    expect(incident.fingerprint).toBeTruthy();
    expect(incident.category).toBe('server');
    expect(incident.attempt_count).toBe(0);
  });

  it('Stage 3→4: fix 결과(branch, sha)가 verifier 입력과 일치한다', async () => {
    // fix executor 출력 형식
    const fixOutput = {
      branchName: 'fix/agent-abc12345',
      baseSha: 'b'.repeat(40),
      candidateSha: 'c'.repeat(40),
    };

    const fingerprint = 'test-fp-stage3to4';

    // verifier에 전달되는 입력 구성
    mockCreateGitHub.mockReturnValue({
      getCheckRuns: vi.fn().mockResolvedValue([
        { name: 'lint', status: 'completed', conclusion: 'success' },
        { name: 'typeCheck', status: 'completed', conclusion: 'success' },
        { name: 'test', status: 'completed', conclusion: 'success' },
        { name: 'build', status: 'completed', conclusion: 'success' },
      ]),
      getCompareCommits: vi.fn().mockResolvedValue([
        { filename: 'src/views/home/home-view.tsx', status: 'modified' },
      ]),
      getWorkflowRuns: vi.fn().mockResolvedValue([
        { id: 123, status: 'completed', conclusion: 'success' },
      ]),
      getWorkflowRunArtifacts: vi.fn().mockResolvedValue([
        {
          name: 'reproduction-result',
          data: {
            beforeSha: fixOutput.baseSha,
            afterSha: fixOutput.candidateSha,
            isFailedBefore: true,
            isPassedAfter: true,
            isSameTest: true,
          },
        },
      ]),
      getDefaultBranch: vi.fn().mockResolvedValue({ branch: 'main', sha: fixOutput.baseSha }),
      readFile: vi.fn().mockResolvedValue(null),
      createPullRequest: vi.fn().mockResolvedValue({ number: 42, url: 'https://github.com/test/pr/42' }),
      mergePullRequest: vi.fn().mockResolvedValue({ sha: MERGE_SHA, merged: true }),
      deleteBranch: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof createGitHubClient>);

    mockGetPreview.mockResolvedValue({
      id: 'dpl-preview',
      url: 'https://preview.vercel.app',
      readyState: 'READY',
      createdAt: Date.now(),
    });

    const incident: Incident = {
      fingerprint,
      category: 'server',
      project_id: PROJECT_ID,
      environment: 'production',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      occurrence_count: 3,
      attempt_count: 1,
      status: 'verifying',
      locked_by: null,
      locked_at: null,
    };

    const verifyConfig = {
      anthropicApiKey: 'sk-test',
      githubToken: 'gh-test',
      githubOwner: 'owner',
      githubRepo: 'repo',
      vercelToken: 'vt-test',
      vercelProjectId: 'vp-test',
      maxTokens: 4096,
    };

    // ci_pending → ci_checking (CI 통과)
    const tick1 = await handleVerifyAttempt({
      attemptId: 'att-1',
      fingerprint,
      branchName: fixOutput.branchName,
      baseSha: fixOutput.baseSha,
      candidateSha: fixOutput.candidateSha,
      attemptCount: 1,
      incident,
      currentState: null,
      createdAt: new Date().toISOString(),
      config: verifyConfig,
    });
    expect(tick1.result.phase).toBe('ci_checking');
    expect(tick1.state.checks?.lint?.isPassed).toBe(true);

    // ci_checking → review_pending (재현증명 통과)
    const tick2 = await handleVerifyAttempt({
      attemptId: 'att-1',
      fingerprint,
      branchName: fixOutput.branchName,
      baseSha: fixOutput.baseSha,
      candidateSha: fixOutput.candidateSha,
      attemptCount: 1,
      incident,
      currentState: tick1.state,
      createdAt: new Date().toISOString(),
      config: verifyConfig,
    });
    expect(tick2.result.phase).toBe('review_pending');

    // 리뷰+스코프 결과 주입 → preview_pending
    const reviewedState: VerifyState = {
      ...tick2.state,
      review: {
        isApproved: true,
        isIncidentPathCovered: true,
        isRegressionCovered: true,
        isValidationWeakened: false,
        findings: [],
      },
      checks: {
        ...tick2.state.checks,
        scope: { commitSha: fixOutput.candidateSha, isPassed: true },
        review: { commitSha: fixOutput.candidateSha, isPassed: true },
      },
      phase: 'preview_pending',
    };

    // preview_pending → merge_ready
    const tick3 = await handleVerifyAttempt({
      attemptId: 'att-1',
      fingerprint,
      branchName: fixOutput.branchName,
      baseSha: fixOutput.baseSha,
      candidateSha: fixOutput.candidateSha,
      attemptCount: 1,
      incident,
      currentState: reviewedState,
      createdAt: new Date().toISOString(),
      config: verifyConfig,
    });
    expect(tick3.result.phase).toBe('merge_ready');
    expect(tick3.state.checks?.preview?.isPassed).toBe(true);
    expect(tick3.state.checks?.e2e?.isPassed).toBe(true);

    // merge_ready → merged
    const tick4 = await handleVerifyAttempt({
      attemptId: 'att-1',
      fingerprint,
      branchName: fixOutput.branchName,
      baseSha: fixOutput.baseSha,
      candidateSha: fixOutput.candidateSha,
      attemptCount: 1,
      incident,
      currentState: tick3.state,
      createdAt: new Date().toISOString(),
      config: verifyConfig,
    });
    expect(tick4.result.phase).toBe('merged');
    expect(tick4.state.mergeCommitSha).toBe(MERGE_SHA);
    expect(tick4.state.prNumber).toBe(42);
  });

  it('Stage 4→5: verifier의 mergeCommitSha가 monitor 입력으로 정확히 전달된다', async () => {
    const fingerprint = 'test-fp-stage4to5';

    const incident: Incident = {
      fingerprint,
      category: 'server',
      project_id: PROJECT_ID,
      environment: 'production',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      occurrence_count: 3,
      attempt_count: 1,
      status: 'deploying',
      locked_by: null,
      locked_at: null,
    };

    const monitorConfig = {
      vercelToken: 'vt-test',
      vercelProjectId: 'vp-test',
      githubToken: 'gh-test',
      githubOwner: 'owner',
      githubRepo: 'repo',
    };

    // deploy_pending → observing
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-prod',
        url: 'https://app.vercel.app',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: MERGE_SHA,
      },
      {
        id: 'dpl-prev',
        url: 'https://prev.vercel.app',
        readyState: 'READY',
        createdAt: Date.now() - 10000,
        commitSha: 'b'.repeat(40),
      },
    ]);

    const tick1 = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint,
      incident,
      mergeCommitSha: MERGE_SHA,
      currentState: null,
      createdAt: new Date().toISOString(),
      config: monitorConfig,
    });

    expect(tick1.result.phase).toBe('observing');
    expect(tick1.state.deploymentId).toBe('dpl-prod');
    expect(tick1.state.previousDeploymentId).toBe('dpl-prev');
    expect(tick1.state.mergeCommitSha).toBe(MERGE_SHA);

    // observing → resolved
    mockGetErrors.mockResolvedValue([]);
    mockEvaluateMonitoring.mockReturnValue({
      action: 'resolved',
      reason: 'production-verified',
    } as MonitoringDecision);

    const tick2 = await handleMonitorAttempt({
      attemptId: 'att-1',
      fingerprint,
      incident,
      mergeCommitSha: MERGE_SHA,
      currentState: tick1.state,
      createdAt: new Date().toISOString(),
      config: monitorConfig,
    });

    expect(tick2.result.phase).toBe('resolved');
    expect(tick2.state.snapshots).toHaveLength(1);
    expect(tick2.state.snapshots[0].syntheticResults).toHaveLength(2);
  });

  it('Stage 5 롤백 경로: 에러 감지 → rollback_pending → Vercel 롤백 + git revert → rollback_complete', async () => {
    const fingerprint = 'rollback-test-fp';

    const incident: Incident = {
      fingerprint,
      category: 'server',
      project_id: PROJECT_ID,
      environment: 'production',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      occurrence_count: 5,
      attempt_count: 1,
      status: 'monitoring',
      locked_by: null,
      locked_at: null,
    };

    const monitorConfig = {
      vercelToken: 'vt-test',
      vercelProjectId: 'vp-test',
      githubToken: 'gh-test',
      githubOwner: 'owner',
      githubRepo: 'repo',
    };

    const observingState: MonitorState = {
      phase: 'observing',
      deploymentId: 'dpl-prod',
      previousDeploymentId: 'dpl-prev',
      mergeCommitSha: MERGE_SHA,
      observationStartedAt: new Date(Date.now() - 360_000).toISOString(),
      snapshots: [],
      rollbackDeploymentId: null,
      revertCommitSha: null,
      stoppedReason: null,
      updatedAt: new Date().toISOString(),
    };

    // 에러 감지 → rollback 판정
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-prod',
        url: 'https://app.vercel.app',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: MERGE_SHA,
      },
    ]);
    mockGetErrors.mockResolvedValue([
      { message: 'TypeError', stack: '', path: '/', count: 10, firstSeen: '', lastSeen: '' },
    ]);
    mockEvaluateMonitoring.mockReturnValue({
      action: 'rollback',
      reason: 'production-regression',
    } as MonitoringDecision);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 500 });

    const rollbackTrigger = await handleMonitorAttempt({
      attemptId: 'att-rb-1',
      fingerprint,
      incident,
      mergeCommitSha: MERGE_SHA,
      currentState: observingState,
      createdAt: new Date().toISOString(),
      config: monitorConfig,
    });

    expect(rollbackTrigger.result.phase).toBe('rollback_pending');

    // rollback_pending → rollback_complete
    mockPromote.mockResolvedValue(true);
    mockCreateGitHub.mockReturnValue({
      revertCommit: vi.fn().mockResolvedValue('d'.repeat(40)),
    } as unknown as ReturnType<typeof createGitHubClient>);

    const rollbackResult = await handleMonitorAttempt({
      attemptId: 'att-rb-1',
      fingerprint,
      incident,
      mergeCommitSha: MERGE_SHA,
      currentState: rollbackTrigger.state,
      createdAt: new Date().toISOString(),
      config: monitorConfig,
    });

    expect(rollbackResult.result.phase).toBe('rollback_complete');
    expect(rollbackResult.state.rollbackDeploymentId).toBe('dpl-prev');
    expect(rollbackResult.state.revertCommitSha).toBe('d'.repeat(40));

    // Vercel promote가 이전 배포 ID로 호출됐는지 확인
    expect(mockPromote).toHaveBeenCalledWith('vt-test', 'vp-test', 'dpl-prev');
  });

  it('Stage 5 킬 스위치: deploy 타임아웃 시 stopped 전이', async () => {
    const fingerprint = 'kill-switch-fp';
    const incident: Incident = {
      fingerprint,
      category: 'server',
      project_id: PROJECT_ID,
      environment: 'production',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      occurrence_count: 1,
      attempt_count: 1,
      status: 'deploying',
      locked_by: null,
      locked_at: null,
    };

    mockGetDeployments.mockResolvedValue([]);

    const result = await handleMonitorAttempt({
      attemptId: 'att-ks-1',
      fingerprint,
      incident,
      mergeCommitSha: MERGE_SHA,
      currentState: null,
      createdAt: new Date(Date.now() - 700_000).toISOString(), // 10분 초과
      config: {
        vercelToken: 'vt-test',
        vercelProjectId: 'vp-test',
        githubToken: 'gh-test',
        githubOwner: 'owner',
        githubRepo: 'repo',
      },
    });

    expect(result.result.phase).toBe('stopped');
    expect(result.state.stoppedReason).toBe('deploy-timeout');
  });

  it('Stage 5 배포 교체 감지: 다른 사람이 배포하면 stopped', async () => {
    const fingerprint = 'supersede-fp';
    const incident: Incident = {
      fingerprint,
      category: 'server',
      project_id: PROJECT_ID,
      environment: 'production',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      occurrence_count: 1,
      attempt_count: 1,
      status: 'monitoring',
      locked_by: null,
      locked_at: null,
    };

    const observingState: MonitorState = {
      phase: 'observing',
      deploymentId: 'dpl-ours',
      previousDeploymentId: 'dpl-prev',
      mergeCommitSha: MERGE_SHA,
      observationStartedAt: new Date().toISOString(),
      snapshots: [],
      rollbackDeploymentId: null,
      revertCommitSha: null,
      stoppedReason: null,
      updatedAt: new Date().toISOString(),
    };

    // 다른 배포가 프로덕션에 올라감
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-someone-else',
        url: 'https://new.vercel.app',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: 'e'.repeat(40),
      },
    ]);

    const result = await handleMonitorAttempt({
      attemptId: 'att-ss-1',
      fingerprint,
      incident,
      mergeCommitSha: MERGE_SHA,
      currentState: observingState,
      createdAt: new Date().toISOString(),
      config: {
        vercelToken: 'vt-test',
        vercelProjectId: 'vp-test',
        githubToken: 'gh-test',
        githubOwner: 'owner',
        githubRepo: 'repo',
      },
    });

    expect(result.result.phase).toBe('stopped');
    expect(result.state.stoppedReason).toBe('deployment-superseded');
  });
});
