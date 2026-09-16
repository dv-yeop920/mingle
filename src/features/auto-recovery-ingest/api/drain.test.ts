// @vitest-environment node
import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { handleDrainRequest, MAX_DRAIN_BYTES, MAX_DRAIN_EVENTS } from './drain';

const CONFIG = {
  signatureSecret: 'test-only-signing-secret',
  projectIds: ['prj_1'],
};
const EVENT = {
  id: 'evt_1',
  projectId: 'prj_1',
  deploymentId: 'dpl_1',
  timestamp: 1000,
  source: 'lambda',
  level: 'error',
};
const createRequest = (
  body = JSON.stringify([EVENT]),
  headers: Record<string, string> = {},
) =>
  new Request('https://example.test/api/auto-recovery/drain', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'x-vercel-signature': createHmac('sha1', CONFIG.signatureSecret)
        .update(body)
        .digest('hex'),
      ...headers,
    },
  });

describe('서명된 Drain 수집', () => {
  it.each([undefined, -1, 400, 404, 429, 500, 503])(
    '500뿐 아니라 상태 %s 이벤트를 전달한다',
    async (statusCode) => {
      const enqueue = vi.fn().mockResolvedValue(undefined);
      const response = await handleDrainRequest(
        createRequest(JSON.stringify([{ ...EVENT, statusCode }])),
        CONFIG,
        enqueue,
      );
      expect(response.status).toBe(202);
      expect(enqueue).toHaveBeenCalledOnce();
    },
  );
  it('빌드 오류와 NDJSON을 지원한다', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const response = await handleDrainRequest(
      createRequest(`${JSON.stringify({ ...EVENT, source: 'build' })}\n`, {
        'content-type': 'application/x-ndjson',
      }),
      CONFIG,
      enqueue,
    );
    expect(response.status).toBe(202);
  });
  it.each(['', 'bad', 'a'.repeat(40)])(
    '없거나 틀린 서명 %s를 거절한다',
    async (signature) => {
      const enqueue = vi.fn();
      const response = await handleDrainRequest(
        createRequest(undefined, { 'x-vercel-signature': signature }),
        CONFIG,
        enqueue,
      );
      expect(response.status).toBe(401);
      expect(enqueue).not.toHaveBeenCalled();
    },
  );
  it('원문 바이트가 바뀌면 기존 서명을 거절한다', async () => {
    const body = JSON.stringify([EVENT]);
    const signature = createHmac('sha1', CONFIG.signatureSecret)
      .update(body)
      .digest('hex');
    const enqueue = vi.fn();
    expect(
      (
        await handleDrainRequest(
          createRequest(`${body} `, { 'x-vercel-signature': signature }),
          CONFIG,
          enqueue,
        )
      ).status,
    ).toBe(401);
    expect(enqueue).not.toHaveBeenCalled();
  });
  it.each([
    '{',
    '{}',
    '[]',
    JSON.stringify([{ ...EVENT, timestamp: -1 }]),
    JSON.stringify([{ ...EVENT, statusCode: 999 }]),
    JSON.stringify(Array(MAX_DRAIN_EVENTS + 1).fill(EVENT)),
  ])('잘못된 전체 배치를 거절한다', async (body) => {
    const enqueue = vi.fn();
    expect(
      (await handleDrainRequest(createRequest(body), CONFIG, enqueue)).status,
    ).toBe(400);
    expect(enqueue).not.toHaveBeenCalled();
  });
  it('다른 프로젝트 이벤트를 필터링하고 허용된 것만 수락한다', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const res = await handleDrainRequest(
      createRequest(
        JSON.stringify([EVENT, { ...EVENT, projectId: 'prj_other' }]),
      ),
      CONFIG,
      enqueue,
    );
    expect(res.status).toBe(202);
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ events: [expect.objectContaining({ projectId: EVENT.projectId })] }),
    );
  });
  it('선언 없이 전송된 큰 본문도 거절한다', async () => {
    const enqueue = vi.fn();
    expect(
      (
        await handleDrainRequest(
          createRequest('x'.repeat(MAX_DRAIN_BYTES + 1)),
          CONFIG,
          enqueue,
        )
      ).status,
    ).toBe(413);
    expect(enqueue).not.toHaveBeenCalled();
  });
  it('본문·메시지·경로·개인정보는 큐에 전달하지 않는다', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    await handleDrainRequest(
      createRequest(
        JSON.stringify([
          {
            ...EVENT,
            message: 'secret',
            path: '/users/private',
            email: 'private@example.test',
            headers: { authorization: 'secret' },
          },
        ]),
      ),
      CONFIG,
      enqueue,
    );
    expect(enqueue.mock.calls[0][0].events).toEqual([EVENT]);
    expect(JSON.stringify(enqueue.mock.calls)).not.toContain('secret');
  });
  it('같은 배치 재전송은 동일한 중복 제거 키를 가진다', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    await handleDrainRequest(createRequest(), CONFIG, enqueue);
    await handleDrainRequest(createRequest(), CONFIG, enqueue);
    expect(enqueue.mock.calls[0][0].batchId).toBe(
      enqueue.mock.calls[1][0].batchId,
    );
  });
  it('하위 큐 실패를 성공으로 응답하지 않는다', async () => {
    const enqueue = vi
      .fn()
      .mockRejectedValue(new Error('private downstream detail'));
    const response = await handleDrainRequest(createRequest(), CONFIG, enqueue);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private downstream detail');
  });
  it('설정이 없으면 수집을 비활성화한다', async () => {
    const enqueue = vi.fn();
    expect(
      (await handleDrainRequest(createRequest(), null, enqueue)).status,
    ).toBe(503);
    expect(enqueue).not.toHaveBeenCalled();
  });
});
