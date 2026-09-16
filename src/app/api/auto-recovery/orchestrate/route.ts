import { NextResponse } from 'next/server';

import { createAdminClient } from '@/shared/lib/supabase/admin';

import { handleOrchestrateRequest } from '@/features/auto-recovery-orchestrate';

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

  if (!anthropicApiKey || !githubToken || !githubOwner || !githubRepo) {
    return NextResponse.json(
      { error: 'Missing required configuration' },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();

  const result = await handleOrchestrateRequest(supabase, {
    anthropicApiKey,
    githubToken,
    githubOwner,
    githubRepo,
    vercelToken: process.env.VERCEL_TOKEN,
    vercelProjectId: process.env.AUTO_RECOVERY_VERCEL_PROJECT_ID,
    maxTokens: Number(process.env.AUTO_RECOVERY_MAX_TOKENS) || 4096,
  });

  return NextResponse.json(result, { status: 200 });
};

export { GET };
