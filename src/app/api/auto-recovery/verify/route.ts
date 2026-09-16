import { NextResponse } from 'next/server';

import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Json } from '@/shared/types/database';

import { handleVerifyAttempt } from '@/features/auto-recovery-orchestrate/api/verifier';
import type { Incident, VerifyState } from '@/features/auto-recovery-orchestrate/model/types';

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

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.AUTO_RECOVERY_GITHUB_TOKEN;
  const githubOwner = process.env.AUTO_RECOVERY_GITHUB_OWNER;
  const githubRepo = process.env.AUTO_RECOVERY_GITHUB_REPO;
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.AUTO_RECOVERY_VERCEL_PROJECT_ID;

  if (
    !anthropicApiKey ||
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
  const workerId = `verify-${Date.now()}`;

  const { data: incidents, error: acquireError } = await supabase.rpc(
    'acquire_incident_for_verify',
    { p_worker_id: workerId },
  );

  if (acquireError || !incidents || incidents.length === 0) {
    return NextResponse.json({ verified: null }, { status: 200 });
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
    return NextResponse.json({ verified: null }, { status: 200 });
  }

  const attempt = attempts[0];
  const currentState = (attempt.checks as VerifyState) ?? null;

  const { result, state } = await handleVerifyAttempt({
    attemptId: attempt.id,
    fingerprint: incident.fingerprint,
    branchName: attempt.branch_name ?? '',
    baseSha: attempt.base_sha ?? '',
    candidateSha: attempt.candidate_sha ?? '',
    attemptCount: incident.attempt_count,
    incident,
    currentState,
    createdAt: attempt.created_at,
    config: {
      anthropicApiKey,
      githubToken,
      githubOwner,
      githubRepo,
      vercelToken,
      vercelProjectId,
      maxTokens: Number(process.env.AUTO_RECOVERY_MAX_TOKENS) || 4096,
    },
  });

  await supabase
    .from('auto_recovery_attempts')
    .update({
      checks: state as unknown as Json,
      reproduction: state.reproduction as unknown as Json,
      review: state.review as unknown as Json,
      deploy_id: state.deployId,
    })
    .eq('id', attempt.id);

  let newStatus = incident.status;
  if (state.phase === 'merged') {
    newStatus = 'deploying';
  } else if (state.phase === 'stopped') {
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

  if (state.phase === 'stopped' || state.phase === 'merged') {
    await supabase
      .from('auto_recovery_attempts')
      .update({
        result: state.phase === 'merged' ? 'resolved' : 'stopped',
        completed_at: new Date().toISOString(),
      })
      .eq('id', attempt.id);
  }

  return NextResponse.json({ verified: result }, { status: 200 });
};

export { GET };
