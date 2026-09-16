import { createHash } from 'node:crypto';

const ERROR_CATEGORIES = [
  'server',
  'client',
  'build',
  'deployment',
  'network',
  'functional',
] as const;
const MAX_REPAIR_ATTEMPTS = 2;
const MIN_OBSERVATION_MS = 5 * 60 * 1000;

type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

// Adapters supply stable opaque IDs from trusted registries, never messages,
// URLs, stack traces, user identifiers, or request bodies. Hashing is not redaction.
type IncidentIdentityInput = {
  category: ErrorCategory;
  projectId: string;
  environment: 'production' | 'preview';
  releaseId: string;
  signatureId: string;
};

const isOpaqueId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);

const createIncidentIdentity = (input: IncidentIdentityInput) => {
  if (
    !input ||
    !ERROR_CATEGORIES.includes(input.category) ||
    !['production', 'preview'].includes(input.environment) ||
    ![input.projectId, input.releaseId, input.signatureId].every(isOpaqueId)
  )
    return null;

  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify([
        'v1',
        input.projectId,
        input.environment,
        input.category,
        input.signatureId,
      ]),
    )
    .digest('hex');

  return {
    fingerprint,
    // Release-specific key for ingestion deduplication. Retry budgets and locks
    // belong to fingerprint so a new deployment cannot reset the attempt limit.
    deduplicationKey: createHash('sha256')
      .update(JSON.stringify([fingerprint, input.releaseId]))
      .digest('hex'),
  };
};

type RecoveryEligibility = {
  isExpected: boolean;
  isExternalFailure: boolean;
  isReproducible: boolean;
  isNormalBehaviorKnown: boolean;
  changeScope: 'general-code' | 'protected' | 'unknown';
  // Completed attempts before this attempt; unchanged throughout its checks.
  attemptCount: number;
  // Another worker owns this incident, excluding the current worker.
  isConcurrentRepairActive: boolean;
  isPreviousProductionRepairFailed: boolean;
};
type RecoveryDecision = {
  action: 'repair' | 'ignore' | 'report' | 'stop';
  reason: string;
};

const evaluateRecoveryEligibility = (
  input: RecoveryEligibility,
): RecoveryDecision => {
  if (!input || !Number.isInteger(input.attemptCount) || input.attemptCount < 0)
    return { action: 'stop', reason: 'invalid-attempt-count' };
  if (input.isPreviousProductionRepairFailed !== false)
    return { action: 'stop', reason: 'production-failure-or-missing-evidence' };
  if (input.attemptCount >= MAX_REPAIR_ATTEMPTS)
    return { action: 'stop', reason: 'attempt-limit' };
  if (input.isConcurrentRepairActive !== false)
    return { action: 'stop', reason: 'active-incident-or-missing-evidence' };
  if (input.isExpected === true)
    return { action: 'ignore', reason: 'expected-error' };
  if (input.isExpected !== false || input.isExternalFailure !== false)
    return { action: 'report', reason: 'external-or-unclassified-error' };
  if (input.changeScope !== 'general-code')
    return { action: 'report', reason: 'protected-or-unknown-scope' };
  if (input.isReproducible !== true || input.isNormalBehaviorKnown !== true)
    return { action: 'report', reason: 'insufficient-reproduction' };
  return { action: 'repair', reason: 'eligible' };
};

type CheckEvidence = { commitSha: string; isPassed: boolean };
type MergeEvidence = {
  eligibility: RecoveryEligibility;
  candidateSha: string;
  baseSha: string;
  currentMainSha: string;
  reproduction: {
    beforeSha: string;
    afterSha: string;
    isFailedBefore: boolean;
    isPassedAfter: boolean;
    isSameTest: boolean;
  };
  checks: Record<
    | 'lint'
    | 'typeCheck'
    | 'test'
    | 'build'
    | 'scope'
    | 'review'
    | 'preview'
    | 'e2e',
    CheckEvidence
  >;
  isIndependentReview: boolean;
  isIncidentPathCovered: boolean;
  isRegressionCovered: boolean;
  isValidationWeakened: boolean;
};

const isCommitSha = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

const evaluateMergeEvidence = (
  input: MergeEvidence,
): { isAllowed: boolean; reason: string } => {
  if (
    !input ||
    evaluateRecoveryEligibility(input.eligibility).action !== 'repair'
  )
    return { isAllowed: false, reason: 'ineligible' };
  if (
    ![input.candidateSha, input.baseSha, input.currentMainSha].every(
      isCommitSha,
    ) ||
    input.baseSha !== input.currentMainSha ||
    input.candidateSha === input.baseSha
  )
    return { isAllowed: false, reason: 'invalid-or-stale-commit' };
  const reproduction = input.reproduction;
  if (
    !reproduction ||
    reproduction.beforeSha !== input.baseSha ||
    reproduction.afterSha !== input.candidateSha ||
    reproduction.isFailedBefore !== true ||
    reproduction.isPassedAfter !== true ||
    reproduction.isSameTest !== true
  )
    return { isAllowed: false, reason: 'unproven-reproduction' };
  const checks = [
    'lint',
    'typeCheck',
    'test',
    'build',
    'scope',
    'review',
    'preview',
    'e2e',
  ] as const;
  if (
    checks.some(
      (name) =>
        input.checks?.[name]?.isPassed !== true ||
        input.checks[name].commitSha !== input.candidateSha,
    )
  )
    return { isAllowed: false, reason: 'missing-failed-or-stale-check' };
  if (
    input.isIndependentReview !== true ||
    input.isIncidentPathCovered !== true ||
    input.isRegressionCovered !== true ||
    input.isValidationWeakened !== false
  )
    return { isAllowed: false, reason: 'insufficient-review-or-coverage' };
  return { isAllowed: true, reason: 'verified' };
};

type MonitoringEvidence = {
  deploymentId: string;
  observedDeploymentId: string;
  elapsedMs: number;
  requestCount: number;
  errorCount: number;
  targetRequestCount: number;
  targetErrorCount: number;
  // Trusted operational configuration, calibrated before activation.
  minRequestCount: number;
  minTargetRequestCount: number;
  maxObservationMs: number;
  maxErrorRate: number;
  syntheticSuccessCount: number;
  syntheticFailureCount: number;
  recurrenceCount: number;
  newMajorErrorCount: number;
  isTelemetryHealthy: boolean;
  isRollbackAvailable: boolean;
};
type MonitoringDecision = {
  action: 'observe' | 'resolved' | 'rollback' | 'stop';
  reason: string;
};

const evaluateProductionMonitoring = (
  input: MonitoringEvidence,
): MonitoringDecision => {
  if (
    !input ||
    !isOpaqueId(input.deploymentId) ||
    input.deploymentId !== input.observedDeploymentId ||
    ![
      input.elapsedMs,
      input.requestCount,
      input.errorCount,
      input.targetRequestCount,
      input.targetErrorCount,
      input.syntheticSuccessCount,
      input.syntheticFailureCount,
      input.recurrenceCount,
      input.newMajorErrorCount,
    ].every((value) => Number.isSafeInteger(value) && value >= 0) ||
    !Number.isFinite(input.maxErrorRate) ||
    input.maxErrorRate < 0 ||
    input.maxErrorRate >= 1 ||
    input.errorCount > input.requestCount ||
    input.targetRequestCount > input.requestCount ||
    input.targetErrorCount > input.targetRequestCount ||
    input.targetErrorCount > input.errorCount ||
    ![input.minRequestCount, input.minTargetRequestCount].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    ) ||
    !Number.isSafeInteger(input.maxObservationMs) ||
    input.maxObservationMs < MIN_OBSERVATION_MS
  )
    return { action: 'stop', reason: 'invalid-monitoring-evidence' };
  const isWorse =
    input.recurrenceCount > 0 ||
    input.newMajorErrorCount > 0 ||
    input.syntheticFailureCount > 0 ||
    (input.requestCount >= input.minRequestCount &&
      input.errorCount / input.requestCount > input.maxErrorRate) ||
    (input.targetRequestCount >= input.minTargetRequestCount &&
      input.targetErrorCount / input.targetRequestCount > input.maxErrorRate);
  if (isWorse)
    return input.isRollbackAvailable === true
      ? { action: 'rollback', reason: 'production-regression' }
      : { action: 'stop', reason: 'production-regression-no-rollback' };
  if (input.isTelemetryHealthy !== true)
    return { action: 'stop', reason: 'unhealthy-telemetry' };
  if (
    input.elapsedMs < MIN_OBSERVATION_MS ||
    input.requestCount < input.minRequestCount ||
    input.targetRequestCount < input.minTargetRequestCount ||
    input.syntheticSuccessCount < 1
  )
    return input.elapsedMs >= input.maxObservationMs
      ? { action: 'stop', reason: 'observation-timeout' }
      : { action: 'observe', reason: 'insufficient-observation' };
  return { action: 'resolved', reason: 'production-verified' };
};

export {
  ERROR_CATEGORIES,
  MAX_REPAIR_ATTEMPTS,
  MIN_OBSERVATION_MS,
  createIncidentIdentity,
  evaluateRecoveryEligibility,
  evaluateMergeEvidence,
  evaluateProductionMonitoring,
  type ErrorCategory,
  type IncidentIdentityInput,
  type RecoveryEligibility,
  type RecoveryDecision,
  type CheckEvidence,
  type MergeEvidence,
  type MonitoringEvidence,
  type MonitoringDecision,
};
