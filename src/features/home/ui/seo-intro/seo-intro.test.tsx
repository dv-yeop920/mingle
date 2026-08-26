import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SeoIntro } from './seo-intro';

describe('SeoIntro', () => {
  it('그룹 궁합의 분석 범위와 핵심 항목을 올바른 제목 계층으로 안내한다', () => {
    const { container } = render(<SeoIntro />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'MBTI 그룹 궁합, 무엇을 알려주나요?',
      }),
    ).toBeInTheDocument();
    expect(container.querySelector('h1')).not.toBeInTheDocument();

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('그룹 분위기')).toBeInTheDocument();
    expect(within(list).getByText('멤버 역할')).toBeInTheDocument();
    expect(within(list).getByText('1:1 케미')).toBeInTheDocument();
  });

  it('MBTI를 대화를 위한 참고로 안내한다', () => {
    render(<SeoIntro />);

    expect(
      screen.getByText(/관계를 단정하는 진단이 아니에요/),
    ).toBeInTheDocument();
    expect(screen.getByText(/대화를 시작하는 참고/)).toBeInTheDocument();
  });
});
