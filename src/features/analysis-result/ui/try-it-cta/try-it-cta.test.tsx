import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TryItCta } from './try-it-cta';

type MockLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  children: ReactNode;
  href: string;
};

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: MockLinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('TryItCta', () => {
  it('compact variant는 짧은 문구와 /group-type 링크를 표시한다', () => {
    render(<TryItCta variant="compact" />);

    expect(
      screen.getByText('나도 우리 그룹 케미를 알아볼까?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /해보기/ })).toHaveAttribute(
      'href',
      '/group-type',
    );
  });

  it('full variant는 안내 문구와 버튼형 링크를 표시한다', () => {
    render(<TryItCta variant="full" />);

    expect(
      screen.getByText('우리 그룹의 MBTI 케미도 궁금하다면?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '나도 해보기' })).toHaveAttribute(
      'href',
      '/group-type',
    );
  });

  it('className을 전달하면 루트 요소에 병합된다', () => {
    render(<TryItCta variant="compact" className="custom-class" />);

    expect(screen.getByRole('link', { name: /해보기/ })).toHaveClass(
      'custom-class',
    );
  });

  it('클릭 시 onClick 콜백을 호출한다', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TryItCta variant="compact" onClick={onClick} />);

    await user.click(screen.getByRole('link', { name: /해보기/ }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('full variant에서도 onClick 콜백을 호출한다', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TryItCta variant="full" onClick={onClick} />);

    await user.click(screen.getByRole('link', { name: '나도 해보기' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
