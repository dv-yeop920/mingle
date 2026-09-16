// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { checkScope } from './scope-checker';

describe('Scope Checker', () => {
  it('src/ 내부 파일만 있으면 통과한다', () => {
    const result = checkScope([
      { filename: 'src/features/test/component.tsx', status: 'modified' },
      { filename: 'src/shared/ui/button.tsx', status: 'modified' },
    ]);
    expect(result.isPassed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('.auto-recovery-meta.json은 허용한다', () => {
    const result = checkScope([
      { filename: '.auto-recovery-meta.json', status: 'added' },
      { filename: 'src/features/test/fix.ts', status: 'modified' },
    ]);
    expect(result.isPassed).toBe(true);
  });

  it('src/ 외부 파일은 거부한다', () => {
    const result = checkScope([
      { filename: 'public/logo.png', status: 'added' },
      { filename: 'src/features/test/fix.ts', status: 'modified' },
    ]);
    expect(result.isPassed).toBe(false);
    expect(result.violations).toContain('outside-src: public/logo.png');
  });

  it('보호 경로 접근은 거부한다', () => {
    const result = checkScope([
      { filename: 'src/shared/lib/supabase/admin.ts', status: 'modified' },
    ]);
    expect(result.isPassed).toBe(false);
    expect(result.violations[0]).toMatch(/protected-path/);
  });

  it('auth 경로 접근은 거부한다', () => {
    const result = checkScope([
      { filename: 'src/features/auth/model/store.ts', status: 'modified' },
    ]);
    expect(result.isPassed).toBe(false);
    expect(result.violations[0]).toMatch(/protected-path/);
  });

  it('설정 파일 변경은 거부한다', () => {
    const result = checkScope([
      { filename: 'package.json', status: 'modified' },
    ]);
    expect(result.isPassed).toBe(false);
    expect(result.violations[0]).toMatch(/outside-src/);
  });

  it('changedFiles 목록을 반환한다', () => {
    const result = checkScope([
      { filename: 'src/a.ts', status: 'modified' },
      { filename: 'src/b.ts', status: 'added' },
    ]);
    expect(result.changedFiles).toEqual(['src/a.ts', 'src/b.ts']);
  });
});
