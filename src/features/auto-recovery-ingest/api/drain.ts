import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

const MAX_DRAIN_BYTES = 1_048_576;
const MAX_DRAIN_EVENTS = 500;
const SOURCES = [
  'build',
  'edge',
  'lambda',
  'static',
  'external',
  'firewall',
  'redirect',
] as const;
const LEVELS = ['info', 'warning', 'error', 'fatal'] as const;

type DrainConfig = { signatureSecret: string; projectIds: readonly string[] };
type DrainEvent = {
  id: string;
  projectId: string;
  deploymentId: string;
  timestamp: number;
  source: (typeof SOURCES)[number];
  level: (typeof LEVELS)[number];
  statusCode?: number;
};
type DrainBatch = { batchId: string; events: DrainEvent[] };
type DrainEnqueue = (batch: DrainBatch) => Promise<void>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isOpaqueId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

const parseEvent = (value: unknown): DrainEvent | null => {
  if (
    !isRecord(value) ||
    !isOpaqueId(value.id) ||
    !isOpaqueId(value.projectId) ||
    !isOpaqueId(value.deploymentId) ||
    typeof value.timestamp !== 'number' ||
    !Number.isSafeInteger(value.timestamp) ||
    value.timestamp < 0 ||
    !SOURCES.includes(value.source as DrainEvent['source']) ||
    !LEVELS.includes(value.level as DrainEvent['level'])
  )
    return null;
  if (
    value.statusCode !== undefined &&
    (typeof value.statusCode !== 'number' ||
      !Number.isInteger(value.statusCode) ||
      (value.statusCode !== -1 && value.statusCode < 100) ||
      value.statusCode > 599)
  )
    return null;
  return {
    id: value.id,
    projectId: value.projectId,
    deploymentId: value.deploymentId,
    timestamp: value.timestamp,
    source: value.source as DrainEvent['source'],
    level: value.level as DrainEvent['level'],
    ...(value.statusCode === undefined
      ? {}
      : { statusCode: value.statusCode as number }),
  };
};

const handleDrainRequest = async (
  request: Request,
  config: DrainConfig | null,
  enqueue: DrainEnqueue,
): Promise<Response> => {
  const fail = (status: number, error: string) =>
    NextResponse.json({ error }, { status });
  if (!config?.signatureSecret || !config.projectIds.length)
    return fail(503, 'Drain is disabled');
  const signature = request.headers.get('x-vercel-signature');
  if (!signature || !/^[a-fA-F0-9]{40}$/.test(signature))
    return fail(401, 'Invalid signature');
  const contentType = request.headers
    .get('content-type')
    ?.split(';')[0]
    .trim()
    .toLowerCase();
  if (
    contentType !== 'application/json' &&
    contentType !== 'application/x-ndjson' &&
    contentType !== 'application/ndjson'
  )
    return fail(415, 'Unsupported content type');
  const declaredLength = request.headers.get('content-length');
  if (
    declaredLength &&
    (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_DRAIN_BYTES)
  )
    return fail(413, 'Payload too large');
  if (!request.body) return fail(400, 'Empty payload');
  let raw: Buffer;
  const reader = request.body.getReader();
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_DRAIN_BYTES) {
        await reader.cancel();
        return fail(413, 'Payload too large');
      }
      chunks.push(value);
    }
    raw = Buffer.concat(chunks);
  } catch {
    return fail(400, 'Invalid payload');
  } finally {
    reader.releaseLock();
  }
  const expected = createHmac('sha1', config.signatureSecret)
    .update(raw)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex')))
    return fail(401, 'Invalid signature');
  let events: DrainEvent[];
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
    const parsed: unknown =
      contentType === 'application/json'
        ? JSON.parse(text)
        : text
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => JSON.parse(line));
    if (
      !Array.isArray(parsed) ||
      !parsed.length ||
      parsed.length > MAX_DRAIN_EVENTS
    )
      return fail(400, 'Invalid batch');
    const validated = parsed.map(parseEvent);
    if (validated.some((event) => event === null))
      return fail(400, 'Invalid event');
    events = (validated as DrainEvent[]).filter((event) =>
      config.projectIds.includes(event.projectId),
    );
  } catch {
    return fail(400, 'Invalid payload');
  }
  if (!events.length)
    return NextResponse.json({ accepted: 0 }, { status: 200 });
  try {
    await enqueue({
      batchId: createHash('sha256').update(raw).digest('hex'),
      events,
    });
    return NextResponse.json({ accepted: events.length }, { status: 202 });
  } catch {
    return fail(503, 'Collector unavailable');
  }
};

export {
  handleDrainRequest,
  MAX_DRAIN_BYTES,
  MAX_DRAIN_EVENTS,
  type DrainConfig,
  type DrainEvent,
  type DrainBatch,
  type DrainEnqueue,
};
