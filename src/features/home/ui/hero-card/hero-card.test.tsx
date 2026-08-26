import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

  it('카드의 시작 버튼을 선택하면 기존 클릭 동작을 실행한다', () => {
    const onClick = vi.fn();
    render(<HeroCard onClick={onClick} />);

    fireEvent.click(
      screen.getByRole('button', { name: '새로운 MBTI 그룹 케미 테스트 시작' }),
    );

    expect(onClick).toHaveBeenCalledOnce();
  });
});
