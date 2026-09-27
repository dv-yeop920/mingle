import {
  evaluateProductionMonitoring,
  MIN_OBSERVATION_MS,
  type MonitoringEvidence,
} from '@/shared/lib/auto-recovery';

import type {
  Incident,
  MonitorConfig,
  MonitorPhase,
  MonitorResult,
  MonitorSnapshot,
  MonitorState,
} from '../model/types';

import { createGitHubClient } from './github';
import {
  getProductionDeployments,
  getRuntimeErrors,
  promoteDeployment,
} from './vercel-api';

const MAX_DEPLOY_WAIT_MS = 600_000;
const MONITOR_MIN_REQUEST_COUNT = 10;
const MONITOR_MIN_TARGET_REQUEST_COUNT = 3;
const MONITOR_MAX_OBSERVATION_MS = MIN_OBSERVATION_MS * 2;
const MONITOR_MAX_ERROR_RATE = 0.05;

const PRODUCTION_HEALTH_PATHS = ['/', '/api/health'];

const createInitialMonitorState = (): MonitorState => ({
  phase: 'deploy_pending',
  deploymentId: null,
  previousDeploymentId: null,
  mergeCommitSha: null,
  observationStartedAt: null,
  snapshots: [],
  rollbackDeploymentId: null,
  revertCommitSha: null,
  stoppedReason: null,
  updatedAt: new Date().toISOString(),
});

const stopMonitor = (
  state: MonitorState,
  reason: string,
): { state: MonitorState; advanced: boolean } => ({
  state: {
    ...state,
    phase: 'stopped',
    stoppedReason: reason,
    updatedAt: new Date().toISOString(),
  },
  advanced: true,
});

const advanceMonitor = (
  state: MonitorState,
  nextPhase: MonitorPhase,
  patch: Partial<MonitorState> = {},
): { state: MonitorState; advanced: boolean } => ({
  state: {
    ...state,
    ...patch,
    phase: nextPhase,
    updatedAt: new Date().toISOString(),
  },
  advanced: true,
});

const waitingMonitor = (
  state: MonitorState,
): { state: MonitorState; advanced: boolean } => ({
  state: { ...state, updatedAt: new Date().toISOString() },
  advanced: false,
});

const runSyntheticProbes = async (
  productionUrl: string,
): Promise<MonitorSnapshot['syntheticResults']> => {
  const results: MonitorSnapshot['syntheticResults'] = [];

  for (const path of PRODUCTION_HEALTH_PATHS) {
    try {
      const url = productionUrl.startsWith('https://')
        ? `${productionUrl}${path}`
        : `https://${productionUrl}${path}`;

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      results.push({
        path,
        status: response.status,
        ok: response.status >= 200 && response.status < 400,
      });
    } catch {
      results.push({ path, status: null, ok: false });
    }
  }

  return results;
};

const handleDeployPending = async (
  state: MonitorState,
  mergeCommitSha: string,
  createdAt: string,
  config: MonitorConfig,
): Promise<{ state: MonitorState; advanced: boolean }> => {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  if (elapsed > MAX_DEPLOY_WAIT_MS) {
    return stopMonitor(state, 'deploy-timeout');
  }

  const deployments = await getProductionDeployments(
    config.vercelToken,
    config.vercelProjectId,
    10,
  );

  const ourDeployment = deployments.find(
    (d) => d.commitSha === mergeCommitSha && d.readyState === 'READY',
  );

  if (!ourDeployment) return waitingMonitor(state);

  const previousDeployment = deployments.find(
    (d) => d.id !== ourDeployment.id && d.readyState === 'READY',
  );

  return advanceMonitor(state, 'observing', {
    deploymentId: ourDeployment.id,
    previousDeploymentId: previousDeployment?.id ?? null,
    mergeCommitSha,
    observationStartedAt: new Date().toISOString(),
  });
};

const handleObserving = async (
  state: MonitorState,
  incident: Incident,
  config: MonitorConfig,
): Promise<{ state: MonitorState; advanced: boolean }> => {
  const deployments = await getProductionDeployments(
    config.vercelToken,
    config.vercelProjectId,
    3,
  );

  const currentProduction = deployments[0];
  if (!currentProduction || currentProduction.id !== state.deploymentId) {
    return stopMonitor(state, 'deployment-superseded');
  }

  const syntheticResults = await runSyntheticProbes(currentProduction.url);

  const errors = await getRuntimeErrors(
    config.vercelToken,
    config.vercelProjectId,
  );

  const errorCount = errors.reduce((sum, e) => sum + e.count, 0);
  const recurrenceCount = errors.filter((e) =>
    e.message.toLowerCase().includes(incident.category),
  ).length;
  const newErrorTypes = errors.map((e) => e.message.slice(0, 100));

  const snapshot: MonitorSnapshot = {
    timestamp: new Date().toISOString(),
    syntheticResults,
    errorCount,
    recurrenceCount,
    newErrorTypes,
  };

  const updatedSnapshots = [...state.snapshots, snapshot];

  const allSynthetics = updatedSnapshots.flatMap((s) => s.syntheticResults);
  const syntheticSuccessCount = allSynthetics.filter((r) => r.ok).length;
  const syntheticFailureCount = allSynthetics.filter((r) => !r.ok).length;
  const totalRecurrence = updatedSnapshots.reduce(
    (sum, s) => sum + s.recurrenceCount,
    0,
  );
  const allNewTypes = new Set(updatedSnapshots.fla