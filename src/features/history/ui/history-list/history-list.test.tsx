import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAnalyses: vi.fn(),
}));

vi.mock('@/entities/analysis', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/analysis')>()),
  useAnalyses: mocks.useAnalyses,
}));

import { HistoryList } from './history-list';

describe('HistoryList', () => {
  beforeEach(() => {
    mocks.useAnalyses.mockReturnValue({
      data: [
        {
          id: 'analysis-2',
          title: '친구들과의 여행',
          chemistry_score: 84,
          created_at: '2026-08-25T00:00:00.000Z',
          groups: {
            type: 'friends',
            custom_name: null,
            members: [
              { nickname: '민지', mbti: 'ENFP', is_self: true },
              { nickname: '지수', mbti: 'ISTJ', is_self: false },
            ],
          },
        },
      ],
      isLoading: false,
    });
  });

  it('카드를 선택하면 해당 분석 결과로 이동한다', () => {
    render(<HistoryList userId="user-id" filterType="all" />);

    expect(
      screen.getByRole('link', { name: '친구들과의 여행 결과 보기' }),
    ).toHaveAttribute('href', '/result?id=analysis-2');
  });
});
