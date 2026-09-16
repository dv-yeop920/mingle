import { NextResponse } from 'next/server';

import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Json } from '@/shared/types/database';

import { handleMonitorAttempt } from '@/features/auto-recovery-orchestrate/api/monitor';
import type {
  Incident,
  MonitorState,
  VerifyState,
} from '@/features/auto-recovery-orchestrate/model/types';

const GET = async (request: Request) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.AUTO_RECOVERY_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Recovery disabled' }, { status: 503 });
  }

  const githubToken = process.env.AUTO_RECOVERY_GITHUB_TOKEN;
  const githubOwner = process.env.AUTO_RECOVERY_GITHUB_OWNER;
  const githubRepo = process.env.AUTO_RECOVERY_GITHUB_REPO;
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.AUTO_RECOVERY_VERCEL_PROJECT_ID;

  if (
    !githubToken ||
    !githubOwner ||
    !githubRepo ||
    !vercelToken ||
    !vercelProjectId
  ) {
    return NextResponse.json(
      { error: 'Missing required configuration' },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();
  const workerId = `monitor-${Date.now()}`;

  const { data: incidents, error: acquireError } = await supabase.rpc(
    'acquire_incident_for_monitor',
    { p_worker_id: workerId },
  );

  if (acquireError || !incidents || incidents.length === 0) {
    return NextResponse.json({ monitored: null }, { status: 200 });
  }

  const incident = incidents[0] as Incident;

  const { data: attempts } = await supabase
    .from('auto_recovery_attempts')
    .select('*')
    .eq('fingerprint', incident.fingerprint)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!attempts || attempts.length === 0) {
    await supabase
      .from('auto_recovery_incidents')
      .update({ locked_by: null, locked_at: null })
      .eq('fingerprint', incident.fingerprint);
    return NextResponse.json({ monitored: null }, { status: 200 });
  }

  const attempt = attempts[0];
  const verifyState = attempt.checks as VerifyState | null;
  const mergeCommitSha = verifyState?.mergeCommitSha;

  if (!mergeCommitSha) {
    await supabase
      .from('auto_recovery_incidents')
      .update({ locked_by: null, locked_at: null })
      .eq('fingerprint', incident.fingerprint);
    return NextResponse.json({ monitored: null }, { status: 200 });
  }

  const currentState = (attempt.monitoring as MonitorState) ?? null;

  const { result, state } = await handleMonitorAttempt({
    attemptId: attempt.id,
    fingerprint: incident.fingerprint,
    incident,
    mergeCommitSha,
    currentState,
    createdAt: attempt.created_at,
    config: {
      vercelToken,
      vercelProjectId,
      githubToken,
      githubOwner,
      githubRepo,
    },
  });

  await supabase
    .from('auto_recovery_attempts')
    .update({ monitoring: state as unknown as Json })
    .eq('id', attempt.id);

  let newStatus = incident.status;
  if (state.phase === 'observing' && incident.status === 'deploying') {
    newStatus = 'monitoring';
  } else if (state.phase === 'resolved') {
    newStatus = 'resolved';
  } else if (
    state.phase === 'stopped' ||
    state.phase === 'rollback_complete'
  ) {
    newStatus = 'stopped';
  }

  await supabase
    .from('auto_recovery_incidents')
    .update({
      status: newStatus,
      locked_by: null,
      locked_at: null,
    })
    .eq('fingerprint', incident.fingerprint);

  if (
    state.phase === 'resolved' ||
    state.phase === 'rollback_complete' ||
    state.phase === 'stopped'
  ) {
    const attemptResult =
      state.phase === 'resolved'
        ? 'resolved'
        : state.phase === 'rollback_complete'
          ? 'rollback'
          : 'stopped';

    await supabase
      .from('auto_recovery_attempts')
      .update({
        result: attemptResult,
        completed_at: new Date().toISOString(),
      })
      .eq('id', attempt.id);
  }

  return NextResponse.json({ monitored: result }, { status: 200 });
};

export { GET };
