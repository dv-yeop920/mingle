// @vitest-environment node
import { PassThrough } from 'node:stream';

import { renderToPipeableStream } from 'react-dom/server.node';
import { describe, expect, it, vi } from 'vitest';

import { getHomeAuth } from './get-home-auth';
import { HomeView } from './home-view';

vi.mock('./get-home-auth', () => ({ getHomeAuth: vi.fn() }));
vi.mock('./home-reset-effect', () => ({ HomeResetEffect: () => null }));
vi.mock('./home-header', () => ({
  HomeHeader: ({ userId }: { userId: string | null }) => (
    <header>회원 {userId}</header>
  ),
}));
vi.mock('./recent-tests-section', () => ({
  RecentTestsSection: ({ userId }: { userId: string }) => (
    <section>개인 기록 {userId}</section>
  ),
}));

describe('홈 서버 스트리밍', () => {
  it('인증 응답 전에 공개 CTA와 소개를 visible shell에 전송한다', async () => {
    let resolveAuth!: (value: { userId: string; isError: boolean }) => void;
    const auth = new Promise<{ userId: string; isError: boolean }>(
      (resolve) => {
        resolveAuth = resolve;
      },
    );
    vi.mocked(getHomeAuth).mockReturnValue(auth);
    const output = new PassThrough();
    let html = '';
    output.on('data', (chunk: Buffer) => {
      html += chunk.toString();
    });
    const complete = new Promise<void>((resolve, reject) => {
      output.on('end', resolve);
      output.on('error', reject);
    });
    let stream!: ReturnType<typeof renderToPipeableStream>;
    const shell = new Promise<void>((resolve, reject) => {
      stream = renderToPipeableStream(<HomeView />, {
        onShellReady: () => {
          stream.pipe(output);
          resolve();
        },
        onShellError: reject,
        onError: reject,
      });
    });

    try {
      await shell;
      expect(html).toContain('새로운 MBTI 그룹 케미 테스트 시작');
      expect(html).toContain('href="/group-type"');
      expect(html).toContain('MBTI 그룹 궁합, 무엇을 알려주나요?');
      expect(html).not.toMatch(/<div hidden|hidden=""/);
      expect(html).not.toContain('member-a');
      expect(getHomeAuth).toHaveBeenCalledTimes(2);

      resolveAuth({ userId: 'member-a', isError: false });
      await complete;
      expect(html).toContain('회원 <!-- -->member-a');
      expect(html).toContain('개인 기록 <!-- -->member-a');
    } finally {
      stream.abort();
    }
  });
});
