// @vitest-environment node
import { createHmac } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

import { POST } from './route';

const SECRET = 'test-signing-secret';
const createRequest = (isValid = true) => {
  const body = JSON.stringify([
    {
      id: 'evt_1',
      projectId: 'prj_1',
      deploymentId: 'dpl_1',
      timestamp: 1000,
      source: 'lambda',
      level: 'error',
    },
  ]);
  return new Request('https://example.test/api/auto-recovery/drain', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'x-vercel-signature': isValid
        ? createHmac('sha1', SECRET).update(body).digest('hex')
        : '0'.repeat(40),
    },
  });
};

beforeEach(() => {
  vi.stubEnv('AUTO_RECOVERY_INGEST_ENABLED', 'true');
  vi.stubEnv('AUTO_RECOVERY_DRAIN_SECRET', SECRET);
  vi.stubEnv('AUTO_RECOVERY_PROJECT_IDS', 'prj_1');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Drain 라우트 경계', () => {
  it.each([
    'AUTO_RECOVERY_INGEST_ENABLED',
    'AUTO_RECOVERY_DRAIN_SECRET',
    'AUTO_RECOVERY_PROJECT_IDS',
  ])('%s 설정 없이는 저장하지 않는다', async (key) => {
    vi.stubEnv(key, '');
    expect((await POST(createRequest())).status).toBe(503);
  });
  it('서명 불일치 시 저장하지 않는다', async () => {
    expect((await POST(createRequest(false))).status).toBe(401);
  });
  it('유효한 요청은 수락한다', async () => {
    const response = await POST(createRequest());
    expect(response.status).toBe(202);
  });
});
