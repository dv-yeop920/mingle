// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkPreviewHealth, HEALTH_PATHS } from './preview-health';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  vi.clearAllMocks();
});

describe('Preview Health Check', () => {
  it('모든 경로가 200이면 모두 ok', async () => {
    mockFetch.mockResolvedValue({ status: 200 });

    const checks = await checkPreviewHealth('https://preview.vercel.app');
    expect(checks).toHaveLength(HEALTH_PATHS.length);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('하나라도 실패하면 해당 항목은 ok=false', async () => {
    mockFetch
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 500 });

    const checks = await checkPreviewHealth('https://preview.vercel.app');
    expect(checks[0].ok).toBe(true);
    expect(checks[1].ok).toBe(false);
    expect(checks[1].status).toBe(500);
  });

  it('네트워크 에러 시 status=null, ok=false', async () => {
    mockFetch.mockRejectedValue(new Error('network'));

    const checks = await checkPreviewHealth('https://preview.vercel.app');
    expect(checks.every((c) => !c.ok)).toBe(true);
    expect(checks[0].status).toBeNull();
  });

  it('프로토콜 없는 URL에 https:// 를 붙인다', async () => {
    mockFetch.mockResolvedValue({ status: 200 });

    await checkPreviewHealth('preview.vercel.app');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://preview.vercel.app'),
      expect.any(Object),
    );
  });
});
