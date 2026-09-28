import { randomUUID } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import { MAX_REPAIR_ATTEMPTS } from '@/shared/lib/auto-recovery';
import type { Database } from '@/shared/types/database';

import type {
  OrchestrateConfig,
  OrchestrateResult,
  RuntimeError,
} from '../model/types';

import { classifyEvents } from './classifier';
import { executeFix } from './fix-executor';

type EventRow = {
  message?: string;
  requestPath?: string;
  level: string;
  timestamp: number;
};

const queryErrorEvents = async (
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<RuntimeError[]> => {
  const { data: batches } = await supabase
    .from('auto_recovery_events')
    .select('events')
    .eq('project_id', projectId)
    .order('received_at', { ascending: false })
    .limit(200);

  if (!batches?.length) return [];

  const grouped = new Map<string, RuntimeError>();
  for (const batch of batches) {
    const events = batch.events as unknown as EventRow[];
    if (!Array.isArray(events)) continue;
    for (const event of events) {
      if (event.level !== 'error' && event.level !== 'fatal') continue;
      const message = event.message || 'Unknown error';
      const key = message.slice(0, 200);
      const timestamp = event.timestamp
        ? new Date(event.timestamp).toISOString()
        : new Date().toISOString();
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
        existing.lastSeen = timestamp;
      } else {
        grouped.set(key, {
          message,
          stack: '',
          path: event.requestPath || '',
          count: 1,
          firstSeen: timestamp,
          lastSeen: timestamp,
        });
      }
    }
  }

  return [...grouped.values()].sort((a, b) => b.count - a.count);
};

const handleOrchestrateRequest = async (
  supabase: SupabaseClient<Database>,
  config: OrchestrateConfig,
): Promise<OrchestrateResult> => {
  const classified = await classifyEvents(supabase);

  const workerId = `worker-${randomUUID().slice(0, 8)}`;

  const { data: incidents, error: acquireError } = await supabase.rpc(
    'acquire_incident_for_repair',
    { p_worker_id: workerId },
  );

  if (acquireError || !incidents?.length) {
    return { classified, incident: null, decision: null, attemptId: null };
  }

  const incident = incidents[0];

  if (incident.attempt_count >= MAX_REPAIR_ATTEMPTS) {
    await supabase
      .from('auto_recovery_incidents')
      .update({ status: 'stopped' })
      .eq('fingerprint', incident.fingerprint);
    await supabase.rpc('release_incident_lock', {
      p_fingerprint: incident.fingerprint,
    });
    return {
      classified,
      incident: { fingerprint: incident.fingerprint, status: 'stopped' },
      decision: { action: 'stop', reason: 'attempt-limit' },
      attemptId: null,
    };
  }

  const { data: previousFailures } = await supabase
    .from('auto_recovery_attempts')
    .select('id')
    .eq('fingerprint', incident.fingerprint)
    .eq('result', 'rollback')
    .limit(1);
  const isPreviousProductionRepairFailed = (previousFailures?.length ?? 0) > 0;

  if (isPreviousProductionRepairFailed) {
    await supabase
      .from('auto_recovery_incidents')
      .update({ status: 'stopped' })
      .eq('fingerprint', incident.fingerprint);
    await supabase.rpc('release_incident_lock', {
      p_fingerprint: incident.fingerprint,
    });
    return {
      classified,
      incident: { fingerprint: incident.fingerprint, status: 'stopped' },
      decision: {
        action: 'stop',
        reason: 'production-failure-or-missing-evidence',
      },
      attemptId: null,
    };
  }

  const runtimeErrors = await queryErrorEvents(supabase, incident.project_id);

  const fixResult = await executeFix(
    incident,
    {
      attemptCount: incident.attempt_count,
      isConcurrentRepairActive: false,
      isPreviousProductionRepairFailed,
    },
    config,
    runtimeErrors,
  );

  const attemptNumber = incident.attempt_count + 1;
  const isRepairSuccess =
    fixResult.decision.action === 'repair' && fixResult.candidateSha;

  const { data: attempt } = await supabase
    .from('auto_recovery_attempts')
    .insert({
      fingerprint: incident.fingerprint,
      attempt_number: attemptNumber,
      branch_name: fixResult.branchName,
      base_sha: fixResult.baseSha,
      candidate_sha: fixResult.candidateSha,
      result: isRepairSuccess ? null : fixResult.decision.reason,
      completed_at: isRepairSuccess ? null : new Date().toISOString(),
    })
    .select('id')
    .single();

  const newStatus = isRepairSuccess ? 'verifying' : 'stopped';

  await supabase
    .from('auto_recovery_incidents')
    .update({
      status: newStatus,
      attempt_count: attemptNumber,
    })
    .eq('fingerprint', incident.fingerprint);

  await supabase.rpc('release_incident_lock', {
    p_fingerprint: incident.fingerprint,
  });

  return {
    classified,
    incident: { fingerprint: incident.fingerprint, status: newStatus },
    decision: fixResult.decision,
    attemptId: attempt?.id ?? null,
  };
};

export { handleOrchestrateRequest };
