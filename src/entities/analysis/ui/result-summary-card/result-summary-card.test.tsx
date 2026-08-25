import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResultSummaryCard } from './result-summary-card';

const DEFAULT_PROPS = {
  title: '오래 저장한 테스트 제목',
  groupType: '가족',
  memberCount: 4,
  chemistryScore: 87,
  date: '2026. 08. 25.',
  representativeMbtis: ['ENFP', 'ISTJ'],
  icon: '🏠',
  href: '/result?id=analysis-1',
};

describe('ResultSummaryCard', () => {
  it('타이틀을 한 줄 말줄임으로 표시한다', () => {
    render(<ResultSummaryCard {...DEFAULT_PROPS} />);

    expect(screen.getByRole('heading', { name: DEFAULT_PROPS.title })).toHaveClass(
      'truncate',
    );
  });

  it('날짜를 그룹 타입보다 먼저 같은 메타 행에 표시한다', () => {
    render(<ResultSummaryCard {...DEFAULT_PROPS} />);

    const date = screen.getByText(DEFAULT_PROPS.date);
    const group = screen.getByText('가족 · 4명');

    expect(date.parentElement).toBe(group.parentElement);
    expect(date.compareDocumentPosition(group)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('그룹 아이콘을 표시한다', () => {
    render(<ResultSummaryCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('🏠')).toBeInTheDocument();
  });

  it('저장된 결과로 이동하는 접근 가능한 링크로 렌더링한다', () => {
    render(<ResultSummaryCard {...DEFAULT_PROPS} />);

    expect(
      screen.getByRole('link', { name: `${DEFAULT_PROPS.title} 결과 보기` }),
    ).toHaveAttribute('href', DEFAULT_PROPS.href);
  });
});
