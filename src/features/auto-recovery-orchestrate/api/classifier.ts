import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createIncidentIdentity,
  type ErrorCategory,
} from '@/shared/lib/auto-recovery';
import type { Database } from '@/shared/types/database';

const SOURCE_TO_CATEGORY: Record<string, ErrorCategory> = {
  lambda: 'server',
  edge: 'server',
  build: 'build',
  static: 'client',
  external: 'network',
  firewall: 'network',
};

const ERROR_LEVELS = new Set(['error', 'fatal']);

type EventRecord = {
  id: string;
  projectId: string;
  deploymentId: string;
  timestamp: number;
  source: string;
  level: string;
  statusCode?: number;
};

const classifyEvents = async (
  supabase: SupabaseClient<Database>,
): Promise<number> => {
  const { data: batches, error } = await supabase
    .from('auto_recovery_events')
    .select('batch_id, project_id, events')
    .is('classified_at', null)
    .order('received_at', { ascending: true })
    .limit(50);

  if (error || !batches?.length) return 0;

  const incidentUpdates = new Map<
    string,
    {
      fingerprint: string;
      category: ErrorCategory;
      projectId: string;
      environment: 'production' | 'preview';
      deploymentId: string;
      timestamp: number;
      count: number;
    }
  >();

  for (const batch of batches) {
    const events = batch.events as unknown as EventRecord[];
    if (!Array.isArray(events)) continue;

    for (const event of events) {
      if (!ERROR_LEVELS.has(event.level)) continue;

      const category = SOURCE_TO_CATEGORY[event.source];
      if (!category) continue;

      const signatureId = `${event.source}-${event.level}-${event.statusCode ?? 'unknown'}`;

      const identity = createIncidentIdentity({
        category,
        projectId: event.projectId,
        environment: 'production',
        releaseId: event.deploymentId,
        signatureId,
      });
      if (!identity) continue;

      const existing = incidentUpdates.get(identity.fingerprint);
      if (existing) {
        existing.count += 1;
        existing.timestamp = Math.max(existing.timestamp, event.timestamp);
      } else {
        incidentUpdates.set(identity.fingerprint, {
          fingerprint: identity.fingerprint,
          category,
          projectId: event.projectId,
          environment: 'production',
          deploymentId: event.deploymentId,
          timestamp: event.timestamp,
          count: 1,
        });
      }
    }
  }

  for (const update of incidentUpdates.values()) {
    const now = new Date(update.timestamp).toISOString();

    const { data: existing } = await supabase
      .from('auto_recovery_incidents')
      .select('fingerprint, occurrence_count')
      .eq('fingerprint', update.fingerprint)
      .single();

    if (existing) {
      await supabase
        .from('auto_recovery_incidents')
        .update({
          last_seen_at: now,
          occurrence_count: existing.occurrence_count + update.count,
        })
        .eq('fingerprint', update.fingerprint);
    } else {
      await supabase.from('auto_recovery_incidents').insert({
        fingerprint: update.fingerprint,
        category: update.category,
        project_id: update.projectId,
        environment: update.environment,
        first_seen_at: now,
        last_seen_at: now,
        occurrence_count: update.count,
      });
    }
  }

  const batchIds = batches.map((b) => b.batch_id);
  await supabase
    .from('auto_recovery_events')
    .update({ classified_at: new Date().toISOString() })
    .in('batch_id', batchIds);

  return batches.length;
};

export { classifyEvents };
