// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({})),
}));

vi.mock('@/features/auto-recovery-orchestrate', () => ({
  handleOrchestrateRequest: vi
    .fn()
    .mockResolvedValue({
      classified: 0,
      incident: null,
      decision: null,
      attemptId: null,
    }),
}));

import { GET } from './route';

const CRON_SECRET = 'test-cron-secret';

const createRequest = (headers: Record<string, string> = {}) =>
  new Request('https://example.test/api/auto-recovery/orchestrate', {
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
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Orchestrate 라우트', () => {
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
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const response = await GET(
      createRequest({ authorization: `Bearer ${CRON_SECRET}` }),
    );
    expect(response.status).toBe(503);
  });

  it('유효한 요청은 200을 반환한다', async () => {
    const response = await GET(
      createRequest({ authorization: `Bearer ${CRON_SECRET}` }),
    );
    expect(response.status).toBe(200);
  });
});
