// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { config } from './proxy';

const matchesMiddleware = (pathname: string): boolean => {
  const regex = new RegExp(`^${config.matcher[0]}$`);
  return regex.test(pathname);
};

describe('Auto-Recovery 프록시 예외', () => {
  it('auto-recovery API 경로는 프록시를 우회한다', () => {
    expect(matchesMiddleware('/api/auto-recovery/drain')).toBe(false);
    expect(matchesMiddleware('/api/auto-recovery/orchestrate')).toBe(false);
    expect(matchesMiddleware('/api/auto-recovery/verify')).toBe(false);
  });

  it.each(['/api/private', '/settings', '/login'])(
    '%s 경로는 프록시를 적용한다',
    (url) => {
      expect(matchesMiddleware(url)).toBe(true);
    },
  );
});
