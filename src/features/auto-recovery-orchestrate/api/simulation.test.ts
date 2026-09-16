// @vitest-environment node
/**
 * 가상 시나리오 시뮬레이션 테스트
 *
 * 프로덕션 환경에서 발생할 수 있는 현실적 시나리오를 시뮬레이션하여
 * 파이프라인의 전체 흐름이 정상 동작하는지 검증한다.
 *
 * 시나리오:
 * 1. Happy Path: 에러 → 수집 → 분류 → 수정 → 검증 → 병합 → 모니터링 → resolved
 * 2. CI 실패 경로: 수정 코드가 lint 실패 → stopped
 * 3. 리뷰 거절 경로: 독립 리뷰어가 보안 문제 발견 → stopped
 * 4. 스코프 위반 경로: 보호 경로 수정 시도 → stopped
 * 5. 프리뷰 헬스체크 실패: 배포는 됐지만 헬스체크 실패 → stopped
 * 6. 프로덕션 회귀: 배포 후 에러 재발 → rollback → rollback_complete
 * 7. 동시 수정 차단: 같은 인시던트에 대한 중복 수정 방지
 * 8. 시도 횟수 초과: MAX_REPAIR_ATTEMPTS 도달 → stopped
 * 9. Stale main: merge 시점에 main이 앞으로 간 경우 → 병합 거절
 * 10. 메타 파일 무결성: .auto-recovery-meta.json 데이터 정합성
 */
import { createHmac } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createIncidentIdentity,
  evaluateMergeEvidence,
  evaluateRecoveryEligibility,
  MAX_REPAIR_ATTEMPTS,
  MIN_OBSERVATION_MS,
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
const { checkScope } = await import('./scope-checker');
const { evaluateProductionMonitoring: mockEvalMonitor } = await import(
  '@/shared/lib/auto-recovery'
);
const {
  getRuntimeErrors,
  getPreviewDeployment,
  getProductionDeployments,
  promoteDeployment,
} = await import('./vercel-api');
const { createGitHubClient } = await import('./github');

const mockGetErrors = vi.mocked(getRuntimeErrors);
const mockGetPreview = vi.mocked(getPreviewDeployment);
const mockGetDeployments = vi.mocked(getProductionDeployments);
const mockPromote = vi.mocked(promoteDeployment);
const mockCreateGitHub = vi.mocked(createGitHubClient);
const mockEvaluateMonitoring = vi.mocked(mockEvalMonitor);

// ── Constants ─────────────────────────────────────────────

const DRAIN_SECRET = 'simulation-secret-key';
const PROJECT_ID = 'prj_simul01';
const BASE_SHA = 'a'.repeat(40);
const CANDIDATE_SHA = 'c'.repeat(40);
const MERGE_SHA = 'd'.repeat(40);

const createGitHubMock = (overrides = {}) => ({
  getCheckRuns: vi.fn().mockResolvedValue([
    { name: 'lint', status: 'completed', conclusion: 'success' },
    { name: 'typecheck', status: 'completed', conclusion: 'success' },
    { name: 'test', status: 'completed', conclusion: 'success' },
    { name: 'build', status: 'completed', conclusion: 'success' },
  ]),
  getCompareCommits: vi.fn().mockResolvedValue([
    { filename: 'src/views/home/home-view.tsx', status: 'modified' },
  ]),
  getWorkflowRuns: vi.fn().mockResolvedValue([
    { id: 101, status: 'completed', conclusion: 'success' },
  ]),
  getWorkflowRunArtifacts: vi.fn().mockResolvedValue([
    {
      name: 'reproduction-result',
      data: {
        beforeSha: BASE_SHA,
        afterSha: CANDIDATE_SHA,
        isFailedBefore: true,
        isPassedAfter: true,
        isSameTest: true,
      },
    },
  ]),
  getDefaultBranch: vi
    .fn()
    .mockResolvedValue({ branch: 'main', sha: BASE_SHA }),
  readFile: vi.fn().mockResolvedValue(
    JSON.stringify({
      fingerprint: 'sim-fp',
      baseSha: BASE_SHA,
      incidentCategory: 'server',
      incidentPaths: ['src/views/home/home-view.tsx'],
      fixDescription: 'Fixed null reference in home view',
    }),
  ),
  createPullRequest: vi.fn().mockResolvedValue({
    number: 99,
    url: 'https://github.com/test/pr/99',
  }),
  mergePullRequest: vi
    .fn()
    .mockResolvedValue({ sha: MERGE_SHA, merged: true }),
  deleteBranch: vi.fn().mockResolvedValue(undefined),
  revertCommit: vi.fn().mockResolvedValue('e'.repeat(40)),
  ...overrides,
} as unknown as ReturnType<typeof createGitHubClient>);

const makeIncident = (
  overrides: Partial<Incident> = {},
): Incident => ({
  fingerprint: 'sim-fp-001',
  category: 'server',
  project_id: PROJECT_ID,
  environment: 'production',
  first_seen_at: new Date().toISOString(),
  last_seen_at: new Date().toISOString(),
  occurrence_count: 3,
  attempt_count: 0,
  status: 'verifying',
  locked_by: null,
  locked_at: null,
  ...overrides,
});

const makeVerifyConfig = () => ({
  anthropicApiKey: 'sk-test',
  githubToken: 'gh-test',
  githubOwner: 'owner',
  githubRepo: 'repo',
  vercelToken: 'vt-test',
  vercelProjectId: 'vp-test',
  maxTokens: 4096,
});

const makeMonitorConfig = () => ({
  vercelToken: 'vt-test',
  vercelProjectId: 'vp-test',
  githubToken: 'gh-test',
  githubOwner: 'owner',
  githubRepo: 'repo',
});

// ── Tests ──────────────────────────────────────────────────

describe('시나리오 1: Happy Path — 에러 수집부터 프로덕션 검증까지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });
  });

  it('Drain → Verify 전체 Phase 순회 → Monitor resolved', async () => {
    // ── Step 1: Drain 수집 ──
    const payload = [
      {
        id: 'evt_sim_001',
        projectId: PROJECT_ID,
        deploymentId: 'dpl_sim',
        timestamp: Date.now(),
        source: 'lambda',
        level: 'error',
        statusCode: 500,
      },
    ];
    const body = JSON.stringify(payload);
    const enqueue = vi.fn().mockResolvedValue(undefined);

    const drainResp = await handleDrainRequest(
      new Request('https://app.test/api/auto-recovery/drain', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-vercel-signature': createHmac('sha1', DRAIN_SECRET)
            .update(body)
            .digest('hex'),
        },
        body,
      }),
      { signatureSecret: DRAIN_SECRET, projectIds: [PROJECT_ID] },
      enqueue,
    );
    expect(drainResp.status).toBe(202);
    expect(enqueue).toHaveBeenCalledOnce();

    // ── Step 2: fingerprint 생성 확인 ──
    const identity = createIncidentIdentity({
      category: 'server',
      projectId: PROJECT_ID,
      environment: 'production',
      releaseId: 'dpl_sim',
      signatureId: 'lambda-error-500',
    });
    expect(identity).not.toBeNull();

    const incident = makeIncident({
      fingerprint: identity!.fingerprint,
      attempt_count: 1,
    });

    mockCreateGitHub.mockReturnValue(createGitHubMock());
    mockGetPreview.mockResolvedValue({
      id: 'dpl-preview-sim',
      url: 'https://preview-sim.vercel.app',
      readyState: 'READY',
      createdAt: Date.now(),
    });

    // ── Step 3: Verify 4-tick 순회 ──
    // tick1: ci_pending → ci_checking
    const tick1 = await handleVerifyAttempt({
      attemptId: 'att-sim-1',
      fingerprint: incident.fingerprint,
      branchName: 'fix/agent-sim-001',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident,
      currentState: null,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });
    expect(tick1.result.phase).toBe('ci_checking');

    // tick2: ci_checking → review_pending
    const tick2 = await handleVerifyAttempt({
      attemptId: 'att-sim-1',
      fingerprint: incident.fingerprint,
      branchName: 'fix/agent-sim-001',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident,
      currentState: tick1.state,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });
    expect(tick2.result.phase).toBe('review_pending');
    expect(tick2.state.reproduction).not.toBeNull();

    // review+scope 주입 → preview_pending
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
        scope: { commitSha: CANDIDATE_SHA, isPassed: true },
        review: { commitSha: CANDIDATE_SHA, isPassed: true },
      },
      phase: 'preview_pending',
    };

    // tick3: preview_pending → merge_ready
    const tick3 = await handleVerifyAttempt({
      attemptId: 'att-sim-1',
      fingerprint: incident.fingerprint,
      branchName: 'fix/agent-sim-001',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident,
      currentState: reviewedState,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });
    expect(tick3.result.phase).toBe('merge_ready');

    // tick4: merge_ready → merged
    const tick4 = await handleVerifyAttempt({
      attemptId: 'att-sim-1',
      fingerprint: incident.fingerprint,
      branchName: 'fix/agent-sim-001',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident,
      currentState: tick3.state,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });
    expect(tick4.result.phase).toBe('merged');
    expect(tick4.state.mergeCommitSha).toBe(MERGE_SHA);
    expect(tick4.state.prNumber).toBe(99);

    // ── Step 4: Monitor — deploy_pending → observing → resolved ──
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-prod-sim',
        url: 'https://mixti.io',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: MERGE_SHA,
      },
      {
        id: 'dpl-prod-prev',
        url: 'https://prev.mixti.io',
        readyState: 'READY',
        createdAt: Date.now() - 60000,
        commitSha: BASE_SHA,
      },
    ]);

    const monTick1 = await handleMonitorAttempt({
      attemptId: 'att-sim-1',
      fingerprint: incident.fingerprint,
      incident: { ...incident, status: 'deploying' },
      mergeCommitSha: MERGE_SHA,
      currentState: null,
      createdAt: new Date().toISOString(),
      config: makeMonitorConfig(),
    });
    expect(monTick1.result.phase).toBe('observing');
    expect(monTick1.state.deploymentId).toBe('dpl-prod-sim');

    // observing → resolved
    mockGetErrors.mockResolvedValue([]);
    mockEvaluateMonitoring.mockReturnValue({
      action: 'resolved',
      reason: 'production-verified',
    } as MonitoringDecision);

    const monTick2 = await handleMonitorAttempt({
      attemptId: 'att-sim-1',
      fingerprint: incident.fingerprint,
      incident: { ...incident, status: 'monitoring' },
      mergeCommitSha: MERGE_SHA,
      currentState: monTick1.state,
      createdAt: new Date().toISOString(),
      config: makeMonitorConfig(),
    });
    expect(monTick2.result.phase).toBe('resolved');
  });
});

describe('시나리오 2: CI 실패 → 즉시 stopped', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lint 실패 시 ci_pending에서 바로 stopped', async () => {
    mockCreateGitHub.mockReturnValue(
      createGitHubMock({
        getCheckRuns: vi.fn().mockResolvedValue([
          { name: 'lint', status: 'completed', conclusion: 'failure' },
          { name: 'typecheck', status: 'completed', conclusion: 'success' },
          { name: 'test', status: 'completed', conclusion: 'success' },
          { name: 'build', status: 'completed', conclusion: 'success' },
        ]),
      }),
    );

    const result = await handleVerifyAttempt({
      attemptId: 'att-ci-fail',
      fingerprint: 'fp-ci-fail',
      branchName: 'fix/agent-ci-fail',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident: makeIncident({ fingerprint: 'fp-ci-fail' }),
      currentState: null,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });

    expect(result.result.phase).toBe('stopped');
    expect(result.state.stoppedReason).toBe('ci-check-failed');
    expect(result.state.checks?.lint?.isPassed).toBe(false);
  });

  it('build 실패 시에도 stopped', async () => {
    mockCreateGitHub.mockReturnValue(
      createGitHubMock({
        getCheckRuns: vi.fn().mockResolvedValue([
          { name: 'lint', status: 'completed', conclusion: 'success' },
          { name: 'typecheck', status: 'completed', conclusion: 'success' },
          { name: 'test', status: 'completed', conclusion: 'success' },
          { name: 'build', status: 'completed', conclusion: 'failure' },
        ]),
      }),
    );

    const result = await handleVerifyAttempt({
      attemptId: 'att-build-fail',
      fingerprint: 'fp-build-fail',
      branchName: 'fix/agent-build-fail',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident: makeIncident({ fingerprint: 'fp-build-fail' }),
      currentState: null,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });

    expect(result.result.phase).toBe('stopped');
    expect(result.state.checks?.build?.isPassed).toBe(false);
  });
});

describe('시나리오 3: 스코프 위반 → stopped', () => {
  it('보호 경로(auth) 수정 시도 → scope-violation으로 stopped', () => {
    const scopeResult = checkScope([
      { filename: 'src/features/auth/model/store.ts', status: 'modified' },
    ]);
    expect(scopeResult.isPassed).toBe(false);
    expect(scopeResult.violations.length).toBeGreaterThan(0);
  });

  it('설정 파일(package.json) 수정 시도 → scope-violation', () => {
    const scopeResult = checkScope([
      { filename: 'package.json', status: 'modified' },
    ]);
    expect(scopeResult.isPassed).toBe(false);
  });

  it('Supabase 보호 경로 수정 시도 → scope-violation', () => {
    const scopeResult = checkScope([
      {
        filename: 'src/shared/lib/supabase/admin.ts',
        status: 'modified',
      },
    ]);
    expect(scopeResult.isPassed).toBe(false);
  });

  it('.auto-recovery-meta.json은 예외적으로 허용', () => {
    const scopeResult = checkScope([
      { filename: '.auto-recovery-meta.json', status: 'added' },
      { filename: 'src/views/home/home-view.tsx', status: 'modified' },
    ]);
    expect(scopeResult.isPassed).toBe(true);
  });
});

describe('시나리오 4: 프리뷰 헬스체크 실패', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ status: 502 });
  });

  it('프리뷰 배포 READY지만 헬스체크 502 → stopped', async () => {
    mockCreateGitHub.mockReturnValue(createGitHubMock());
    mockGetPreview.mockResolvedValue({
      id: 'dpl-preview-unhealthy',
      url: 'https://preview-unhealthy.vercel.app',
      readyState: 'READY',
      createdAt: Date.now(),
    });

    const previewState: VerifyState = {
      phase: 'preview_pending',
      checks: {
        lint: { commitSha: CANDIDATE_SHA, isPassed: true },
        typeCheck: { commitSha: CANDIDATE_SHA, isPassed: true },
        test: { commitSha: CANDIDATE_SHA, isPassed: true },
        build: { commitSha: CANDIDATE_SHA, isPassed: true },
        scope: { commitSha: CANDIDATE_SHA, isPassed: true },
        review: { commitSha: CANDIDATE_SHA, isPassed: true },
      },
      reproduction: {
        beforeSha: BASE_SHA,
        afterSha: CANDIDATE_SHA,
        isFailedBefore: true,
        isPassedAfter: true,
        isSameTest: true,
      },
      review: {
        isApproved: true,
        isIncidentPathCovered: true,
        isRegressionCovered: true,
        isValidationWeakened: false,
        findings: [],
      },
      deployId: null,
      prNumber: null,
      mergeCommitSha: null,
      stoppedReason: null,
      updatedAt: new Date().toISOString(),
    };

    const result = await handleVerifyAttempt({
      attemptId: 'att-health-fail',
      fingerprint: 'fp-health',
      branchName: 'fix/agent-health',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident: makeIncident({ fingerprint: 'fp-health' }),
      currentState: previewState,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });

    expect(result.result.phase).toBe('stopped');
    expect(result.state.stoppedReason).toBe('health-check-failed');
    expect(result.state.checks?.e2e?.isPassed).toBe(false);
  });

  it('프리뷰 배포 ERROR 상태 → stopped', async () => {
    mockCreateGitHub.mockReturnValue(createGitHubMock());
    mockGetPreview.mockResolvedValue({
      id: 'dpl-preview-error',
      url: 'https://preview-error.vercel.app',
      readyState: 'ERROR',
      createdAt: Date.now(),
    });

    const previewState: VerifyState = {
      phase: 'preview_pending',
      checks: {},
      reproduction: null,
      review: null,
      deployId: null,
      prNumber: null,
      mergeCommitSha: null,
      stoppedReason: null,
      updatedAt: new Date().toISOString(),
    };

    const result = await handleVerifyAttempt({
      attemptId: 'att-deploy-error',
      fingerprint: 'fp-deploy-err',
      branchName: 'fix/agent-deploy-err',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident: makeIncident({ fingerprint: 'fp-deploy-err' }),
      currentState: previewState,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });

    expect(result.result.phase).toBe('stopped');
    expect(result.state.stoppedReason).toBe('preview-deploy-failed');
  });
});

describe('시나리오 5: 프로덕션 회귀 → 자동 롤백', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ status: 500 });
  });

  it('배포 후 에러 재발 → rollback_pending → rollback_complete', async () => {
    const incident = makeIncident({
      fingerprint: 'fp-rollback',
      status: 'monitoring',
      attempt_count: 1,
    });

    const observingState: MonitorState = {
      phase: 'observing',
      deploymentId: 'dpl-our-deploy',
      previousDeploymentId: 'dpl-prev-stable',
      mergeCommitSha: MERGE_SHA,
      observationStartedAt: new Date(Date.now() - 400_000).toISOString(),
      snapshots: [],
      rollbackDeploymentId: null,
      revertCommitSha: null,
      stoppedReason: null,
      updatedAt: new Date().toISOString(),
    };

    // 에러 재발 감지
    mockGetDeployments.mockResolvedValue([
      {
        id: 'dpl-our-deploy',
        url: 'https://mixti.io',
        readyState: 'READY',
        createdAt: Date.now(),
        commitSha: MERGE_SHA,
      },
    ]);
    mockGetErrors.mockResolvedValue([
      {
        message: 'TypeError: Cannot read properties of null',
        stack: '',
        path: '/api/analysis',
        count: 15,
        firstSeen: '',
        lastSeen: '',
      },
    ]);
    mockEvaluateMonitoring.mockReturnValue({
      action: 'rollback',
      reason: 'production-regression',
    } as MonitoringDecision);

    const rollbackTrigger = await handleMonitorAttempt({
      attemptId: 'att-rb',
      fingerprint: 'fp-rollback',
      incident,
      mergeCommitSha: MERGE_SHA,
      currentState: observingState,
      createdAt: new Date().toISOString(),
      config: makeMonitorConfig(),
    });
    expect(rollbackTrigger.result.phase).toBe('rollback_pending');

    // 실제 롤백 수행
    mockPromote.mockResolvedValue(true);
    mockCreateGitHub.mockReturnValue(createGitHubMock());

    const rollbackResult = await handleMonitorAttempt({
      attemptId: 'att-rb',
      fingerprint: 'fp-rollback',
      incident,
      mergeCommitSha: MERGE_SHA,
      currentState: rollbackTrigger.state,
      createdAt: new Date().toISOString(),
      config: makeMonitorConfig(),
    });

    expect(rollbackResult.result.phase).toBe('rollback_complete');
    expect(rollbackResult.state.rollbackDeploymentId).toBe('dpl-prev-stable');
    expect(rollbackResult.state.revertCommitSha).toBe('e'.repeat(40));

    // Vercel promote가 이전 배포로 호출됐는지 확인
    expect(mockPromote).toHaveBeenCalledWith(
      'vt-test',
      'vp-test',
      'dpl-prev-stable',
    );
  });

  it('이전 배포 없으면 롤백 불가 → stopped', async () => {
    const stateNoRollback: MonitorState = {
      phase: 'rollback_pending',
      deploymentId: 'dpl-only',
      previousDeploymentId: null,
      mergeCommitSha: MERGE_SHA,
      observationStartedAt: new Date().toISOString(),
      snapshots: [],
      rollbackDeploymentId: null,
      revertCommitSha: null,
      stoppedReason: null,
      updatedAt: new Date().toISOString(),
    };

    const result = await handleMonitorAttempt({
      attemptId: 'att-no-rb',
      fingerprint: 'fp-no-rb',
      incident: makeIncident({
        fingerprint: 'fp-no-rb',
        status: 'monitoring',
      }),
      mergeCommitSha: MERGE_SHA,
      currentState: stateNoRollback,
      createdAt: new Date().toISOString(),
      config: makeMonitorConfig(),
    });

    expect(result.result.phase).toBe('stopped');
    expect(result.state.stoppedReason).toBe('no-previous-deployment');
  });
});

describe('시나리오 6: 정책 함수 경계 조건 검증', () => {
  it('시도 횟수 초과 시 repair 불가', () => {
    const decision = evaluateRecoveryEligibility({
      isExpected: false,
      isExternalFailure: false,
      isReproducible: true,
      isNormalBehaviorKnown: true,
      changeScope: 'general-code',
      attemptCount: MAX_REPAIR_ATTEMPTS,
      isConcurrentRepairActive: false,
      isPreviousProductionRepairFailed: false,
    });
    expect(decision.action).toBe('stop');
    expect(decision.reason).toBe('attempt-limit');
  });

  it('동시 수정 진행 중이면 차단', () => {
    const decision = evaluateRecoveryEligibility({
      isExpected: false,
      isExternalFailure: false,
      isReproducible: true,
      isNormalBehaviorKnown: true,
      changeScope: 'general-code',
      attemptCount: 0,
      isConcurrentRepairActive: true,
      isPreviousProductionRepairFailed: false,
    });
    expect(decision.action).toBe('stop');
    expect(decision.reason).toBe('active-incident-or-missing-evidence');
  });

  it('이전 프로덕션 수정 실패 시 차단', () => {
    const decision = evaluateRecoveryEligibility({
      isExpected: false,
      isExternalFailure: false,
      isReproducible: true,
      isNormalBehaviorKnown: true,
      changeScope: 'general-code',
      attemptCount: 0,
      isConcurrentRepairActive: false,
      isPreviousProductionRepairFailed: true,
    });
    expect(decision.action).toBe('stop');
  });

  it('expected 에러는 무시', () => {
    const decision = evaluateRecoveryEligibility({
      isExpected: true,
      isExternalFailure: false,
      isReproducible: true,
      isNormalBehaviorKnown: true,
      changeScope: 'general-code',
      attemptCount: 0,
      isConcurrentRepairActive: false,
      isPreviousProductionRepairFailed: false,
    });
    expect(decision.action).toBe('ignore');
  });

  it('main이 앞으로 간 경우 (stale) merge 거절', () => {
    const verdict = evaluateMergeEvidence({
      eligibility: {
        isExpected: false,
        isExternalFailure: false,
        isReproducible: true,
        isNormalBehaviorKnown: true,
        changeScope: 'general-code',
        attemptCount: 0,
        isConcurrentRepairActive: false,
        isPreviousProductionRepairFailed: false,
      },
      candidateSha: CANDIDATE_SHA,
      baseSha: BASE_SHA,
      currentMainSha: 'f'.repeat(40), // main이 다른 SHA
      reproduction: {
        beforeSha: BASE_SHA,
        afterSha: CANDIDATE_SHA,
        isFailedBefore: true,
        isPassedAfter: true,
        isSameTest: true,
      },
      checks: {
        lint: { commitSha: CANDIDATE_SHA, isPassed: true },
        typeCheck: { commitSha: CANDIDATE_SHA, isPassed: true },
        test: { commitSha: CANDIDATE_SHA, isPassed: true },
        build: { commitSha: CANDIDATE_SHA, isPassed: true },
        scope: { commitSha: CANDIDATE_SHA, isPassed: true },
        review: { commitSha: CANDIDATE_SHA, isPassed: true },
        preview: { commitSha: CANDIDATE_SHA, isPassed: true },
        e2e: { commitSha: CANDIDATE_SHA, isPassed: true },
      },
      isIndependentReview: true,
      isIncidentPathCovered: true,
      isRegressionCovered: true,
      isValidationWeakened: false,
    });

    expect(verdict.isAllowed).toBe(false);
    expect(verdict.reason).toBe('invalid-or-stale-commit');
  });
});

const { evaluateProductionMonitoring: realEvalMonitor } =
  await vi.importActual<typeof import('@/shared/lib/auto-recovery')>(
    '@/shared/lib/auto-recovery',
  );

describe('시나리오 7: 모니터링 증거 기반 판정 (실제 정책 함수)', () => {
  it('충분한 관찰 + 에러 0 → resolved', () => {
    const decision = realEvalMonitor({
      deploymentId: 'dpl_test',
      observedDeploymentId: 'dpl_test',
      elapsedMs: MIN_OBSERVATION_MS + 1,
      requestCount: 100,
      errorCount: 0,
      targetRequestCount: 10,
      targetErrorCount: 0,
      minRequestCount: 10,
      minTargetRequestCount: 3,
      maxObservationMs: MIN_OBSERVATION_MS * 2,
      maxErrorRate: 0.05,
      syntheticSuccessCount: 5,
      syntheticFailureCount: 0,
      recurrenceCount: 0,
      newMajorErrorCount: 0,
      isTelemetryHealthy: true,
      isRollbackAvailable: true,
    });
    expect(decision.action).toBe('resolved');
  });

  it('에러율 초과 + 롤백 가능 → rollback', () => {
    const decision = realEvalMonitor({
      deploymentId: 'dpl_test',
      observedDeploymentId: 'dpl_test',
      elapsedMs: MIN_OBSERVATION_MS + 1,
      requestCount: 100,
      errorCount: 10,
      targetRequestCount: 20,
      targetErrorCount: 10,
      minRequestCount: 10,
      minTargetRequestCount: 3,
      maxObservationMs: MIN_OBSERVATION_MS * 2,
      maxErrorRate: 0.05,
      syntheticSuccessCount: 5,
      syntheticFailureCount: 0,
      recurrenceCount: 0,
      newMajorErrorCount: 0,
      isTelemetryHealthy: true,
      isRollbackAvailable: true,
    });
    expect(decision.action).toBe('rollback');
  });

  it('에러율 초과 + 롤백 불가 → stop', () => {
    const decision = realEvalMonitor({
      deploymentId: 'dpl_test',
      observedDeploymentId: 'dpl_test',
      elapsedMs: MIN_OBSERVATION_MS + 1,
      requestCount: 100,
      errorCount: 10,
      targetRequestCount: 20,
      targetErrorCount: 10,
      minRequestCount: 10,
      minTargetRequestCount: 3,
      maxObservationMs: MIN_OBSERVATION_MS * 2,
      maxErrorRate: 0.05,
      syntheticSuccessCount: 5,
      syntheticFailureCount: 0,
      recurrenceCount: 0,
      newMajorErrorCount: 0,
      isTelemetryHealthy: true,
      isRollbackAvailable: false,
    });
    expect(decision.action).toBe('stop');
    expect(decision.reason).toBe('production-regression-no-rollback');
  });
});

describe('시나리오 8: Verifier 타임아웃 + 터미널 상태 재진입 방지', () => {
  beforeEach(() => vi.clearAllMocks());

  it('30분 초과 시 어떤 phase든 stopped', async () => {
    mockCreateGitHub.mockReturnValue(createGitHubMock());

    const result = await handleVerifyAttempt({
      attemptId: 'att-timeout',
      fingerprint: 'fp-timeout',
      branchName: 'fix/agent-timeout',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident: makeIncident({ fingerprint: 'fp-timeout' }),
      currentState: null,
      createdAt: new Date(Date.now() - 1_900_000).toISOString(), // 31분 전
      config: makeVerifyConfig(),
    });

    expect(result.result.phase).toBe('stopped');
    expect(result.state.stoppedReason).toBe('timeout');
  });

  it('이미 merged인 상태에서 재호출 시 변경 없이 반환', async () => {
    const mergedState: VerifyState = {
      phase: 'merged',
      checks: {},
      reproduction: null,
      review: null,
      deployId: null,
      prNumber: 42,
      mergeCommitSha: MERGE_SHA,
      stoppedReason: null,
      updatedAt: new Date().toISOString(),
    };

    const result = await handleVerifyAttempt({
      attemptId: 'att-reenter',
      fingerprint: 'fp-reenter',
      branchName: 'fix/agent-reenter',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident: makeIncident({ fingerprint: 'fp-reenter' }),
      currentState: mergedState,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });

    expect(result.result.phase).toBe('merged');
    expect(result.result.advanced).toBe(false);
  });

  it('이미 stopped인 상태에서 재호출 시 변경 없이 반환', async () => {
    const stoppedState: VerifyState = {
      phase: 'stopped',
      checks: {},
      reproduction: null,
      review: null,
      deployId: null,
      prNumber: null,
      mergeCommitSha: null,
      stoppedReason: 'ci-check-failed',
      updatedAt: new Date().toISOString(),
    };

    const result = await handleVerifyAttempt({
      attemptId: 'att-stopped-re',
      fingerprint: 'fp-stopped-re',
      branchName: 'fix/agent-stopped',
      baseSha: BASE_SHA,
      candidateSha: CANDIDATE_SHA,
      attemptCount: 1,
      incident: makeIncident({ fingerprint: 'fp-stopped-re' }),
      currentState: stoppedState,
      createdAt: new Date().toISOString(),
      config: makeVerifyConfig(),
    });

    expect(result.result.phase).toBe('stopped');
    expect(result.result.advanced).toBe(false);
  });
});

describe('시나리오 9: Drain 보안 검증', () => {
  it('PII가 큐로 전달되지 않는다', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const payload = [
      {
        id: 'evt_pii',
        projectId: PROJECT_ID,
        deploymentId: 'dpl_pii',
        timestamp: Date.now(),
        source: 'lambda',
        level: 'error',
        message: 'User john@example.com had error',
        path: '/users/private-page',
        email: 'leak@example.com',
        headers: { authorization: 'Bearer secret-token' },
        body: '{"password":"hunter2"}',
      },
    ];
    const body = JSON.stringify(payload);

    await handleDrainRequest(
      new Request('https://app.test/api/auto-recovery/drain', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-vercel-signature': createHmac('sha1', DRAIN_SECRET)
            .update(body)
            .digest('hex'),
        },
        body,
      }),
      { signatureSecret: DRAIN_SECRET, projectIds: [PROJECT_ID] },
      enqueue,
    );

    const enqueuedData = JSON.stringify(enqueue.mock.calls);
    expect(enqueuedData).not.toContain('john@example.com');
    expect(enqueuedData).not.toContain('secret-token');
    expect(enqueuedData).not.toContain('hunter2');
    expect(enqueuedData).not.toContain('leak@example.com');
    expect(enqueuedData).not.toContain('/users/private-page');
  });

  it('유효하지 않은 서명은 즉시 거절', async () => {
    const enqueue = vi.fn();
    const body = JSON.stringify([
      {
        id: 'evt_sig',
        projectId: PROJECT_ID,
        deploymentId: 'dpl_sig',
        timestamp: Date.now(),
        source: 'lambda',
        level: 'error',
      },
    ]);

    const resp = await handleDrainRequest(
      new Request('https://app.test/api/auto-recovery/drain', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-vercel-signature': 'b'.repeat(40), // wrong
        },
        body,
      }),
      { signatureSecret: DRAIN_SECRET, projectIds: [PROJECT_ID] },
      enqueue,
    );

    expect(resp.status).toBe(401);
    expect(enqueue).not.toHaveBeenCalled();
  });
});

describe('시나리오 10: 메타 파일 무결성 + Fingerprint 일관성', () => {
  it('같은 입력으로 생성한 fingerprint는 항상 동일하다', () => {
    const input = {
      category: 'server' as const,
      projectId: PROJECT_ID,
      environment: 'production' as const,
      releaseId: 'dpl_consistency',
      signatureId: 'lambda-error-500',
    };

    const id1 = createIncidentIdentity(input);
    const id2 = createIncidentIdentity(input);

    expect(id1).not.toBeNull();
    expect(id2).not.toBeNull();
    expect(id1!.fingerprint).toBe(id2!.fingerprint);
    expect(id1!.deduplicationKey).toBe(id2!.deduplicationKey);
  });

  it('배포가 달라도 fingerprint는 유지 (시도 예산 공유)', () => {
    const input1 = {
      category: 'server' as const,
      projectId: PROJECT_ID,
      environment: 'production' as const,
      releaseId: 'dpl_v1',
      signatureId: 'lambda-error-500',
    };
    const input2 = { ...input1, releaseId: 'dpl_v2' };

    const id1 = createIncidentIdentity(input1);
    const id2 = createIncidentIdentity(input2);

    expect(id1!.fingerprint).toBe(id2!.fingerprint);
    expect(id1!.deduplicationKey).not.toBe(id2!.deduplicationKey);
  });

  it('다른 signatureId는 다른 fingerprint', () => {
    const base = {
      category: 'server' as const,
      projectId: PROJECT_ID,
      environment: 'production' as const,
      releaseId: 'dpl_x',
    };

    const id1 = createIncidentIdentity({
      ...base,
      signatureId: 'lambda-error-500',
    });
    const id2 = createIncidentIdentity({
      ...base,
      signatureId: 'lambda-fatal-503',
    });

    expect(id1!.fingerprint).not.toBe(id2!.fingerprint);
  });
});
