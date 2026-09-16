import {
  evaluateMergeEvidence,
  type RecoveryEligibility,
} from '@/shared/lib/auto-recovery';

import type {
  Incident,
  VerifyConfig,
  VerifyPhase,
  VerifyResult,
  VerifyState,
} from '../model/types';

import { createGitHubClient } from './github';
import { checkPreviewHealth } from './preview-health';
import { performReview } from './review';
import { checkScope } from './scope-checker';
import { getPreviewDeployment } from './vercel-api';

const MAX_VERIFY_DURATION_MS = 1_800_000;

const CI_CHECK_NAMES: Record<string, 'lint' | 'typeCheck' | 'test' | 'build'> =
  {
    lint: 'lint',
    typecheck: 'typeCheck',
    test: 'test',
    build: 'build',
  };

const createInitialState = (): VerifyState => ({
  phase: 'ci_pending',
  checks: {},
  reproduction: null,
  review: null,
  deployId: null,
  prNumber: null,
  mergeCommitSha: null,
  stoppedReason: null,
  updatedAt: new Date().toISOString(),
});

const stop = (
  state: VerifyState,
  reason: string,
): { state: VerifyState; advanced: boolean } => ({
  state: {
    ...state,
    phase: 'stopped',
    stoppedReason: reason,
    updatedAt: new Date().toISOString(),
  },
  advanced: true,
});

const advance = (
  state: VerifyState,
  nextPhase: VerifyPhase,
  patch: Partial<VerifyState> = {},
): { state: VerifyState; advanced: boolean } => ({
  state: {
    ...state,
    ...patch,
    phase: nextPhase,
    updatedAt: new Date().toISOString(),
  },
  advanced: true,
});

const waiting = (
  state: VerifyState,
): { state: VerifyState; advanced: boolean } => ({
  state: { ...state, updatedAt: new Date().toISOString() },
  advanced: false,
});

const handleCiPending = async (
  state: VerifyState,
  candidateSha: string,
  branchName: string,
  github: ReturnType<typeof createGitHubClient>,
): Promise<{ state: VerifyState; advanced: boolean }> => {
  const checkRuns = await github.getCheckRuns(candidateSha);

  const ciChecks = checkRuns.filter(
    (run) => CI_CHECK_NAMES[run.name.toLowerCase()] !== undefined,
  );

  if (ciChecks.length < 4) return waiting(state);

  const allCompleted = ciChecks.every((run) => run.status === 'completed');
  if (!allCompleted) return waiting(state);

  const updatedChecks = { ...state.checks };
  for (const run of ciChecks) {
    const key = CI_CHECK_NAMES[run.name.toLowerCase()];
    if (key) {
      updatedChecks[key] = {
        commitSha: candidateSha,
        isPassed: run.conclusion === 'success',
      };
    }
  }

  const anyFailed = ciChecks.some((run) => run.conclusion !== 'success');
  if (anyFailed) {
    return stop(
      { ...state, checks: updatedChecks },
      'ci-check-failed',
    );
  }

  return advance(state, 'ci_checking', { checks: updatedChecks });
};

const handleCiChecking = async (
  state: VerifyState,
  candidateSha: string,
  baseSha: string,
  branchName: string,
  github: ReturnType<typeof createGitHubClient>,
): Promise<{ state: VerifyState; advanced: boolean }> => {
  const runs = await github.getWorkflowRuns(
    branchName,
    'auto-recovery-verify.yml',
  );

  const completedRun = runs.find(
    (run) => run.status === 'completed' && run.conclusion === 'success',
  );

  if (!completedRun) {
    const failedRun = runs.find(
      (run) => run.status === 'completed' && run.conclusion === 'failure',
    );
    if (failedRun) return stop(state, 'reproduction-workflow-failed');
    return waiting(state);
  }

  try {
    const artifacts = await github.getWorkflowRunArtifacts(completedRun.id);
    const reproArtifact = artifacts.find(
      (a) => a.name === 'reproduction-result',
    );

    if (!reproArtifact) return waiting(state);

    const reproData = reproArtifact.data as {
      beforeSha?: string;
      afterSha?: string;
      isFailedBefore?: boolean;
      isPassedAfter?: boolean;
      isSameTest?: boolean;
    };

    const reproduction = {
      beforeSha: reproData.beforeSha ?? '',
      afterSha: reproData.afterSha ?? '',
      isFailedBefore: reproData.isFailedBefore === true,
      isPassedAfter: reproData.isPassedAfter === true,
      isSameTest: reproData.isSameTest === true,
    };

    if (
      reproduction.beforeSha !== baseSha ||
      reproduction.afterSha !== candidateSha ||
      !reproduction.isFailedBefore ||
      !reproduction.isPassedAfter ||
      !reproduction.isSameTest
    ) {
      return stop({ ...state, reproduction }, 'reproduction-proof-invalid');
    }

    return advance(state, 'review_pending', { reproduction });
  } catch {
    return waiting(state);
  }
};

const handleReviewPending = async (
  state: VerifyState,
  candidateSha: string,
  baseSha: string,
  incident: Incident,
  config: VerifyConfig,
  github: ReturnType<typeof createGitHubClient>,
): Promise<{ state: VerifyState; advanced: boolean }> => {
  const changedFiles = await github.getCompareCommits(baseSha, candidateSha);
  const scopeResult = checkScope(changedFiles);

  const updatedChecks = {
    ...state.checks,
    scope: { commitSha: candidateSha, isPassed: scopeResult.isPassed },
  };

  if (!scopeResult.isPassed) {
    return stop(
      { ...state, checks: updatedChecks },
      `scope-violation: ${scopeResult.violations.join(', ')}`,
    );
  }

  let diff = '';
  try {
    const files = await github.getCompareCommits(baseSha, candidateSha);
    diff = files.map((f) => `${f.status} ${f.filename}`).join('\n');
  } catch {
    diff = scopeResult.changedFiles.join('\n');
  }

  const metaContent = await github.readFile(
    '.auto-recovery-meta.json',
    candidateSha,
  );
  let fixDescription = '';
  if (metaContent) {
    try {
      const meta = JSON.parse(metaContent) as { fixDescription?: string };
      fixDescription = meta.fixDescription ?? '';
    } catch {
      // ignore parse errors
    }
  }

  const reviewResult = await performReview({
    anthropicApiKey: config.anthropicApiKey,
    maxTokens: config.maxTokens,
    diff,
    changedFiles: scopeResult.changedFiles,
    incidentFingerprint: incident.fingerprint,
    incidentCategory: incident.category,
    fixDescription,
  });

  const finalChecks = {
    ...updatedChecks,
    review: { commitSha: candidateSha, isPassed: reviewResult.isApproved },
  };

  if (!reviewResult.isApproved) {
    return stop(
      { ...state, checks: finalChecks, review: reviewResult },
      'review-rejected',
    );
  }

  return advance(state, 'preview_pending', {
    checks: finalChecks,
    review: reviewResult,
  });
};

const handlePreviewPending = async (
  state: VerifyState,
  candidateSha: string,
  branchName: string,
  config: VerifyConfig,
): Promise<{ state: VerifyState; advanced: boolean }> => {
  const deployment = await getPreviewDeployment(
    config.vercelToken,
    config.vercelProjectId,
    branchName,
  );

  if (!deployment) return waiting(state);

  if (deployment.readyState === 'ERROR') {
    const updatedChecks = {
      ...state.checks,
      preview: { commitSha: candidateSha, isPassed: false },
    };
    return stop(
      { ...state, checks: updatedChecks, deployId: deployment.id },
      'preview-deploy-failed',
    );
  }

  if (deployment.readyState !== 'READY') return waiting(state);

  const healthChecks = await checkPreviewHealth(deployment.url);
  const allHealthy = healthChecks.every((c) => c.ok);

  const updatedChecks = {
    ...state.checks,
    preview: { commitSha: candidateSha, isPassed: true },
    e2e: { commitSha: candidateSha, isPassed: allHealthy },
  };

  if (!allHealthy) {
    return stop(
      { ...state, checks: updatedChecks, deployId: deployment.id },
      'health-check-failed',
    );
  }

  return advance(state, 'merge_ready', {
    checks: updatedChecks,
    deployId: deployment.id,
  });
};

const handleMergeReady = async (
  state: VerifyState,
  candidateSha: string,
  baseSha: string,
  branchName: string,
  incident: Incident,
  attemptCount: number,
  config: VerifyConfig,
  github: ReturnType<typeof createGitHubClient>,
): Promise<{ state: VerifyState; advanced: boolean }> => {
  const defaultBranch = await github.getDefaultBranch();
  const currentMainSha = defaultBranch.sha;

  const eligibility: RecoveryEligibility = {
    isExpected: false,
    isExternalFailure: false,
    isReproducible: true,
    isNormalBehaviorKnown: true,
    changeScope: 'general-code',
    attemptCount,
    isConcurrentRepairActive: false,
    isPreviousProductionRepairFailed: false,
  };

  const mergeEvidence = {
    eligibility,
    candidateSha,
    baseSha,
    currentMainSha,
    reproduction: state.reproduction!,
    checks: state.checks as Record<
      | 'lint'
      | 'typeCheck'
      | 'test'
      | 'build'
      | 'scope'
      | 'review'
      | 'preview'
      | 'e2e',
      { commitSha: string; isPassed: boolean }
    >,
    isIndependentReview: true,
    isIncidentPathCovered: state.review?.isIncidentPathCovered ?? false,
    isRegressionCovered: state.review?.isRegressionCovered ?? false,
    isValidationWeakened: state.review?.isValidationWeakened ?? true,
  };

  const verdict = evaluateMergeEvidence(mergeEvidence);

  if (!verdict.isAllowed) {
    return stop(state, `merge-policy-rejected: ${verdict.reason}`);
  }

  try {
    const pr = await github.createPullRequest(
      branchName,
      defaultBranch.branch,
      `fix(auto-recovery): ${incident.fingerprint.slice(0, 12)}`,
      [
        '## Auto-Recovery Fix',
        `- Incident: ${incident.fingerprint}`,
        `- Category: ${incident.category}`,
        `- Base SHA: ${baseSha}`,
        `- Candidate SHA: ${candidateSha}`,
        '',
        'This PR was automatically generated and verified.',
      ].join('\n'),
    );

    const mergeResult = await github.mergePullRequest(pr.number);

    if (!mergeResult.merged) {
      return stop(
        { ...state, prNumber: pr.number },
        'merge-failed',
      );
    }

    try {
      await github.deleteBranch(branchName);
    } catch {
      // branch cleanup is best-effort
    }

    return advance(state, 'merged', {
      prNumber: pr.number,
      mergeCommitSha: mergeResult.sha,
    });
  } catch {
    return stop(state, 'pr-creation-or-merge-failed');
  }
};

type HandleVerifyAttemptInput = {
  attemptId: string;
  fingerprint: string;
  branchName: string;
  baseSha: string;
  candidateSha: string;
  attemptCount: number;
  incident: Incident;
  currentState: VerifyState | null;
  createdAt: string;
  config: VerifyConfig;
};

const handleVerifyAttempt = async (
  input: HandleVerifyAttemptInput,
): Promise<{ result: VerifyResult; state: VerifyState }> => {
  const state = input.currentState ?? createInitialState();

  if (state.phase === 'merged' || state.phase === 'stopped') {
    return {
      result: {
        attemptId: input.attemptId,
        fingerprint: input.fingerprint,
        phase: state.phase,
        advanced: false,
      },
      state,
    };
  }

  const elapsed =
    Date.now() - new Date(input.createdAt).getTime();
  if (elapsed > MAX_VERIFY_DURATION_MS) {
    const stopped = stop(state, 'timeout');
    return {
      result: {
        attemptId: input.attemptId,
        fingerprint: input.fingerprint,
        phase: stopped.state.phase,
        advanced: true,
      },
      state: stopped.state,
    };
  }

  const github = createGitHubClient({
    token: input.config.githubToken,
    owner: input.config.githubOwner,
    repo: input.config.githubRepo,
  });

  let outcome: { state: VerifyState; advanced: boolean };

  switch (state.phase) {
    case 'ci_pending':
      outcome = await handleCiPending(
        state,
        input.candidateSha,
        input.branchName,
        github,
      );
      break;

    case 'ci_checking':
      outcome = await handleCiChecking(
        state,
        input.candidateSha,
        input.baseSha,
        input.branchName,
        github,
      );
      break;

    case 'review_pending':
      outcome = await handleReviewPending(
        state,
        input.candidateSha,
        input.baseSha,
        input.incident,
        input.config,
        github,
      );
      break;

    case 'preview_pending':
      outcome = await handlePreviewPending(
        state,
        input.candidateSha,
        input.branchName,
        input.config,
      );
      break;

    case 'merge_ready':
      outcome = await handleMergeReady(
        state,
        input.candidateSha,
        input.baseSha,
        input.branchName,
        input.incident,
        input.attemptCount,
        input.config,
        github,
      );
      break;

    default:
      outcome = waiting(state);
  }

  return {
    result: {
      attemptId: input.attemptId,
      fingerprint: input.fingerprint,
      phase: outcome.state.phase,
      advanced: outcome.advanced,
    },
    state: outcome.state,
  };
};

export { handleVerifyAttempt, createInitialState, MAX_VERIFY_DURATION_MS };
