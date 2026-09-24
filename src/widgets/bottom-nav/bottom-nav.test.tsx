import { render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BottomNav } from './bottom-nav';

type MockLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  children: ReactNode;
  href: string;
  prefetch?: boolean;
};

vi.mock('next/link', () => ({
  default: ({ children, href, prefetch, ...props }: MockLinkProps) => (
    <a
      href={href}
      data-prefetch={prefetch === undefined ? 'default' : String(prefetch)}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('BottomNav', () => {
  it('네 링크 모두 Next.js 기본 prefetch 동작을 유지한다', () => {
    render(<BottomNav />);

    for (const name of ['Home', 'History', '분석', 'My']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'data-prefetch',
        'default',
      );
    }
  });
});
