// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  createIncidentIdentity,
  ERROR_CATEGORIES,
  evaluateMergeEvidence,
  evaluateProductionMonitoring,
  evaluateRecoveryEligibility,
  type MergeEvidence,
  type MonitoringEvidence,
  type RecoveryEligibility,
} from './policy';

const BASE_SHA = 'a'.repeat(40);
const CANDIDATE_SHA = 'b'.repeat(40);
const createEligibility = (): RecoveryEligibility => ({
  isExpected: false,
  isExternalFailure: false,
  isReproducible: true,
  isNormalBehaviorKnown: true,
  changeScope: 'general-code',
  attemptCount: 0,
  isConcurrentRepairActive: false,
  isPreviousProductionRepairFailed: false,
});
const createEvidence = (): MergeEvidence => ({
  eligibility: createEligibility(),
  candidateSha: CANDIDATE_SHA,
  baseSha: BASE_SHA,
  currentMainSha: BASE_SHA,
  reproduction: {
    beforeSha: BASE_SHA,
    afterSha: CANDIDATE_SHA,
    isFailedBefore: true,
    isPassedAfter: true,
    isSameTest: true,
  },
  checks: Object.fromEntries(
    [
      'lint',
      'typeCheck',
      'test',
      'build',
      'scope',
      'review',
      'preview',
      'e2e',
    ].map((name) => [name, { commitSha: CANDIDATE_SHA, isPassed: true }]),
  ) as MergeEvidence['checks'],
  isIndependentReview: true,
  isIncidentPathCovered: true,
  isRegressionCovered: true,
  isValidationWeakened: false,
});
const createMonitoring = (): MonitoringEvidence => ({
  deploymentId: 'dpl_new',
  observedDeploymentId: 'dpl_new',
  elapsedMs: 300_000,
  requestCount: 100,
  errorCount: 0,
  targetRequestCount: 10,
  targetErrorCount: 0,
  minRequestCount: 100,
  minTargetRequestCount: 10,
  maxObservationMs: 900_000,
  maxErrorRate: 0.01,
  syntheticSuccessCount: 1,
  syntheticFailureCount: 0,
  recurrenceCount: 0,
  newMajorErrorCount: 0,
  isTelemetryHealthy: true,
  isRollbackAvailable: true,
});

describe('오류 복구 식별 및 실행 정책', () => {
  it.each(ERROR_CATEGORIES)('%s 오류도 HTTP 상태 없이 식별한다', (category) => {
    expect(
      createIncidentIdentity({
        category,
        projectId: 'prj_app',
        environment: 'production',
        releaseId: 'dpl_1',
        signatureId: 'error_1',
      }),
    ).not.toBeNull();
  });
  it('배포가 바뀌어도 시도 예산용 fingerprint를 유지한다', () => {
    const input = {
      category: 'client' as const,
      projectId: 'prj_app',
      environment: 'production' as const,
      releaseId: 'dpl_1',
      signatureId: 'error_1',
    };
    const first = createIncidentIdentity(input)!;
    const second = createIncidentIdentity({ ...input, releaseId: 'dpl_2' })!;
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.deduplicationKey).not.toBe(second.deduplicationKey);
  });
  it('검증된 일반 코드에 첫 두 번만 수정을 허용한다', () => {
    expect(evaluateRecoveryEligibility(createEligibility()).action).toBe(
      'repair',
    );
    expect(
      evaluateRecoveryEligibility({ ...createEligibility(), attemptCount: 1 })
        .action,
    ).toBe('repair');
    expect(
      evaluateRecoveryEligibility({ ...createEligibility(), attemptCount: 2 })
        .action,
    ).toBe('stop');
  });
  it.each([
    { attemptCount: -1 },
    { attemptCount: 0.5 },
    { attemptCount: NaN },
    { isPreviousProductionRepairFailed: true },
    { isConcurrentRepairActive: true },
    { changeScope: 'protected' },
    { changeScope: 'unknown' },
    { isExternalFailure: true },
    { isReproducible: false },
    { isNormalBehaviorKnown: false },
  ])('불충분하거나 위험한 조건에서는 실행하지 않는다: %j', (patch) => {
    expect(
      evaluateRecoveryEligibility({
        ...createEligibility(),
        ...patch,
      } as RecoveryEligibility).action,
    ).not.toBe('repair');
  });
  it.each(Object.keys(createEligibility()))(
    '%s 증거가 없으면 실행하지 않는다',
    (field) => {
      const evidence = { ...createEligibility() } as Record<string, unknown>;
      delete evidence[field];
      expect(
        evaluateRecoveryEligibility(evidence as RecoveryEligibility).action,
      ).not.toBe('repair');
    },
  );
});

describe('자동 병합 검증', () => {
  it('같은 후보와 최신 main의 전체 검증만 승인한다', () => {
    expect(evaluateMergeEvidence(createEvidence()).isAllowed).toBe(true);
    expect(
      evaluateMergeEvidence({
        ...createEvidence(),
        currentMainSha: 'c'.repeat(40),
      }).isAllowed,
    ).toBe(false);
  });
  it.each([
    'lint',
    'typeCheck',
    'test',
    'build',
    'scope',
    'review',
    'preview',
    'e2e',
  ] as const)('%s가 다른 커밋이면 병합하지 않는다', (check) => {
    const evidence = createEvidence();
    evidence.checks[check].commitSha = BASE_SHA;
    expect(evaluateMergeEvidence(evidence).isAllowed).toBe(false);
    delete (evidence.checks as Partial<MergeEvidence['checks']>)[check];
    expect(evaluateMergeEvidence(evidence).isAllowed).toBe(false);
  });
  it.each([
    { beforeSha: CANDIDATE_SHA },
    { afterSha: BASE_SHA },
    { isFailedBefore: false },
    { isPassedAfter: false },
    { isSameTest: false },
  ])('동일 테스트의 수정 전후 증거가 필요하다: %j', (patch) => {
    const evidence = createEvidence();
    Object.assign(evidence.reproduction, patch);
    expect(evaluateMergeEvidence(evidence).isAllowed).toBe(false);
  });
  it.each([
    { isIndependentReview: false },
    { isIncidentPathCovered: false },
    { isRegressionCovered: false },
    { isValidationWeakened: true },
  ])('검토 및 회귀 검증을 우회할 수 없다: %j', (patch) => {
    expect(
      evaluateMergeEvidence({ ...createEvidence(), ...patch }).isAllowed,
    ).toBe(false);
  });
  it.each([null, {}, { eligibility: createEligibility() }])(
    '불완전한 입력을 거부한다: %j',
    (input) => {
      expect(evaluateMergeEvidence(input as MergeEvidence).isAllowed).toBe(
        false,
      );
    },
  );
});

describe('운영 복구 판정', () => {
  it('5분과 최소 트래픽 및 능동 확인을 모두 충족하면 해결한다', () => {
    expect(evaluateProductionMonitoring(createMonitoring()).action).toBe(
      'resolved',
    );
  });
  it.each([
    { elapsedMs: 299_999 },
    { requestCount: 0, targetRequestCount: 0 },
    { requestCount: 99 },
    { syntheticSuccessCount: 0 },
  ])('오류가 없어도 증거가 부족하면 관찰한다: %j', (patch) => {
    expect(
      evaluateProductionMonitoring({ ...createMonitoring(), ...patch }).action,
    ).toBe('observe');
  });
  it.each([
    { recurrenceCount: 1 },
    { newMajorErrorCount: 1 },
    { syntheticFailureCount: 1 },
    { errorCount: 2 },
  ])('악화되면 롤백하고 롤백 불가 시 중단한다: %j', (patch) => {
    expect(
      evaluateProductionMonitoring({ ...createMonitoring(), ...patch }).action,
    ).toBe('rollback');
    expect(
      evaluateProductionMonitoring({
        ...createMonitoring(),
        ...patch,
        isRollbackAvailable: false,
      }).action,
    ).toBe('stop');
  });
  it.each([
    { observedDeploymentId: 'dpl_old' },
    { isTelemetryHealthy: false },
    { elapsedMs: NaN },
    { requestCount: -1 },
    { errorCount: 101 },
    { maxErrorRate: 1 },
  ])('잘못된 증거로 해결 판정하지 않는다: %j', (patch) => {
    expect(
      evaluateProductionMonitoring({ ...createMonitoring(), ...patch }).action,
    ).toBe('stop');
  });
});

describe('운영 관찰 경계', () => {
  it('전체 정상 트래픽이 장애 경로의 낮은 표본 수를 대신하지 않는다', () => {
    expect(
      evaluateProductionMonitoring({
        ...createMonitoring(),
        targetRequestCount: 0,
      }).action,
    ).toBe('observe');
  });
  it('표본이 부족한 채 최대 관찰 시간이 지나면 중단한다', () => {
    expect(
      evaluateProductionMonitoring({
        ...createMonitoring(),
        targetRequestCount: 0,
        elapsedMs: 900_000,
      }).action,
    ).toBe('stop');
  });
  it('전체 오류율이 정상이어도 장애 경로 오류율 악화는 롤백한다', () => {
    expect(
      evaluateProductionMonitoring({
        ...createMonitoring(),
        requestCount: 1000,
        errorCount: 1,
        targetErrorCount: 1,
      }).action,
    ).toBe('rollback');
  });
});
