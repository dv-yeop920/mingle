// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnThis(),
    }),
  })),
}));

vi.mock('@/features/auto-recovery-orchestrate/api/verifier', () => ({
  handleVerifyAttempt: vi.fn().mockResolvedValue({
    result: { attemptId: 'a1', fingerprint: 'f1', phase: 'ci_pending', advanced: false },
    state: { phase: 'ci_pending', checks: {}, reproduction: null, review: null, deployId: null, prNumber: null, mergeCommitSha: null, stoppedReason: null, updatedAt: new Date().toISOString() },
  }),
  createInitialState: vi.fn(),
}));

import { GET } from './route';

const CRON_SECRET = 'test-cron-secret';

const createRequest = (headers: Record<string, string> = {}) =>
  new Request('https://example.test/api/auto-recovery/verify', {
    method: 'GET',
    headers,
  });

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', CRON_SECRET);
  vi.stubEnv('AUTO_RECOVERY_ENABLED', 'true');
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
  vi.stubEnv('AUTO_RECOVERY_GITHUB_TOKEN', 'test-github-token');
  vi.stubEnv('AUTO_RECOVERY_GITHUB_OWNER', 'test-owner');
  vi.stubEnv('AUTO_RECOVERY_GITHUB_REPO', 'test-repo');
  vi.stubEnv('VERCEL_TOKEN', 'test-vercel-token');
  vi.stubEnv('AUTO_RECOVERY_VERCEL_PROJECT_ID', 'prj_vercel_1');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Verify 라우트', () => {
  it('CRON_SECRET 미설정 시 503을 반환한다', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const response = await GET(createRequest());
    expect(response.status).toBe(503);
  });

  it('잘못된 Authorization 헤더 시 401을 반환한다', async () => {
    const response = await GET(
      createRequest({ authorization: 'Bearer wrong-secret' }),
    );
    expect(response.status).toBe(401);
  });

  it('AUTO_RECOVERY_ENABLED가 false면 503을 반환한다', async () => {
    vi.stubEnv('AUTO_RECOVERY_ENABLED', 'false');
    const response = await GET(
      createRequest({ authorization: `Bearer ${CRON_SECRET}` }),
    );
    expect(response.status).toBe(503);
  });

  it('필수 설정 누락 시 503을 반환한다', async () => {
    vi.stubEnv('VERCEL_TOKEN', '');
    const response = await GET(
      createRequest({ authorization: `Bearer ${CRON_SECRET}` }),
    );
    expect(response.status).toBe(503);
  });

  it('verifying 인시던트 없으면 200 + null을 반환한다', async () => {
    const response = await GET(
      createRequest({ authorization: `Bearer ${CRON_SECRET}` }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.verified).toBeNull();
  });
});
