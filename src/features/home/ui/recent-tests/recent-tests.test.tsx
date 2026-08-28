import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RecentTests } from './recent-tests';

const MOCK_ANALYSES = [
  {
    id: 'analysis-1',
    title: '우리 가족 케미',
    chemistry_score: 91,
    created_at: '2026-08-25T00:00:00.000Z',
    groups: {
      type: 'family',
      custom_name: null,
      members: [
        { nickname: '민지', mbti: 'ENFP', is_self: true },
        { nickname: '지수', mbti: 'ISTJ', is_self: false },
      ],
    },
  },
];

describe('RecentTests', () => {
  it('카드를 선택하면 해당 분석 결과로 이동한다', () => {
    render(<RecentTests analyses={MOCK_ANALYSES} />);

    expect(
      screen.getByRole('link', { name: '우리 가족 케미 결과 보기' }),
    ).toHaveAttribute('href', '/result?id=analysis-1');
  });

  it('분석 결과가 없으면 빈 상태 메시지를 보여준다', () => {
    render(<RecentTests analyses={[]} />);

    expect(
      screen.getByText('아직 테스트 기록이 없습니다'),
    ).toBeInTheDocument();
  });
});
