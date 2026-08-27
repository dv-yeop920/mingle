import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeroCard } from './hero-card';

describe('HeroCard', () => {
  it('MBTI 그룹 케미를 설명하는 유일한 메인 제목을 노출한다', () => {
    const { container } = render(<HeroCard />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'MBTI로 알아보는 우리 그룹 케미',
      }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByText(/친구·가족·팀의 MBTI 케미를/)).toBeInTheDocument();
  });

  it('/group-type으로 이동하는 링크를 제공한다', () => {
    render(<HeroCard />);

    const link = screen.getByRole('link', { name: '새로운 MBTI 그룹 케미 테스트 시작' });

    expect(link).toHaveAttribute('href', '/group-type');
  });
});
