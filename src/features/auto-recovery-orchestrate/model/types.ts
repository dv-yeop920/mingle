import type { RecoveryDecision } from '@/shared/lib/auto-recovery';
import type { Tables } from '@/shared/types/database';

type Incident = Tables<'auto_recovery_incidents'>;

type OrchestrateConfig = {
  anthropicApiKey: string;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  vercelToken?: string;
  vercelProjectId?: string;
  maxTokens: number;
};

type OrchestrateResult = {
  classified: number;
  incident: { fingerprint: string; status: string } | null;
  decision: RecoveryDecision | null;
  attemptId: string | null;
};

type FixExecutorConfig = {
  anthropicApiKey: string;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  vercelToken?: string;
  vercelProjectId?: string;
  maxTokens: number;
};

type FixAnalysis = {
  isExpected: boolean;
  isExternalFailure: boolean;
  isReproducible: boolean;
  isNormalBehaviorKnown: boolean;
  changeScope: 'general-code' | 'protected' | 'unknown';
  explanation: string;
};

type FixChange = {
  path: string;
  content: string;
};

type FixResult = {
  analysis: FixAnalysis;
  fix: { files: FixChange[]; description: string } | null;
};

type FixExecutorResult = {
  decision: RecoveryDecision;
  result: FixResult;
  branchName: string | null;
  baseSha: string | null;
  candidateSha: string | null;
};

type RuntimeError = {
  message: string;
  stack: string;
  path: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
};

type VerifyConfig = {
  anthropicApiKey: string;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  vercelToken: string;
  vercelProjectId: string;
  maxTokens: number;
};

type VerifyPhase =
  | 'ci_pending'
  | 'ci_checking'
  | 'review_pending'
  | 'preview_pending'
  | 'merge_ready'
  | 'merged'
  | 'stopped';

type ReviewResult = {
  isApproved: boolean;
  isIncidentPathCovered: boolean;
  isRegressionCovered: boolean;
  isValidationWeakened: boolean;
  findings: string[];
};

type VerifyState = {
  phase: VerifyPhase;
  checks: Partial<
    Record<
      | 'lint'
      | 'typeCheck'
      | 'test'
      | 'build'
      | 'scope'
      | 'review'
      | 'preview'
      | 'e2e',
      { commitSha: string; isPassed: boolean }
    >
  >;
  reproduction: {
    beforeSha: string;
    afterSha: string;
    isFailedBefore: boolean;
    isPassedAfter: boolean;
    isSameTest: boolean;
  } | null;
  review: ReviewResult | null;
  deployId: string | null;
  prNumber: number | null;
  mergeCommitSha: string | null;
  stoppedReason: string | null;
  updatedAt: string;
};

type VerifyResult = {
  attemptId: string;
  fingerprint: string;
  phase: VerifyPhase;
  advanced: boolean;
};

type ReviewConfig = {
  anthropicApiKey: string;
  maxTokens: number;
  diff: string;
  changedFiles: string[];
  incidentFingerprint: string;
  incidentCategory: string;
  fixDescription: string;
};

type MonitorConfig = {
  vercelToken: string;
  vercelProjectId: string;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
};

type MonitorPhase =
  | 'deploy_pending'
  | 'observing'
  | 'resolved'
  | 'rollback_pending'
  | 'rollback_complete'
  | 'stopped';

type MonitorSnapshot = {
  timestamp: string;
  syntheticResults: { path: string; status: number | null; ok: boolean }[];
  errorCount: number;
  recurrenceCount: number;
  newErrorTypes: string[];
};

type MonitorState = {
  phase: MonitorPhase;
  deploymentId: string | null;
  previousDeploymentId: string | null;
  mergeCommitSha: string | null;
  observationStartedAt: string | null;
  snapshots: MonitorSnapshot[];
  rollbackDeploymentId: string | null;
  revertCommitSha: string | null;
  stoppedReason: string | null;
  updatedAt: string;
};

type MonitorResult = {
  attemptId: string;
  fingerprint: string;
  phase: MonitorPhase;
  advanced: boolean;
};

export type {
  Incident,
  OrchestrateConfig,
  OrchestrateResult,
  FixExecutorConfig,
  FixAnalysis,
  FixChange,
  FixResult,
  FixExecutorResult,
  RuntimeError,
  VerifyConfig,
  VerifyPhase,
  VerifyState,
  VerifyResult,
  ReviewConfig,
  ReviewResult,
  MonitorConfig,
  MonitorPhase,
  MonitorSnapshot,
  MonitorState,
  MonitorResult,
};
