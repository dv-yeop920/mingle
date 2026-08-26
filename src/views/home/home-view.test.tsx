import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeView } from './home-view';

const mockPush = vi.fn();
const mockUseProfile = vi.fn();
const mockReset = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/entities/user', () => ({
  useProfile: () => mockUseProfile(),
}));

vi.mock('@/features/home', () => ({
  HeroCard: ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      테스트 시작
    </button>
  ),
  RecentTests: () => <div>최근 테스트</div>,
}));

vi.mock('@/features/test-flow', () => ({
  useTestFlowStore: (
    selector: (state: { reset: typeof mockReset }) => typeof mockReset,
  ) => selector({ reset: mockReset }),
}));

describe('HomeView MBTI setup prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로그인 사용자의 MBTI가 없으면 설정 안내를 보여준다', async () => {
    mockUseProfile.mockReturnValue({
      data: { nickname: '민지', mbti: null },
    });

    render(<HomeView />);

    expect(
      await screen.findByRole('dialog', { name: '프로필 설정이 필요해요' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('MBTI를 설정하고 이용해 주세요'),
    ).toBeInTheDocument();
  });

  it('MBTI 설정하기를 누르면 프로필 설정으로 이동한다', async () => {
    const user = userEvent.setup();
    mockUseProfile.mockReturnValue({
      data: { nickname: '민지', mbti: null },
    });

    render(<HomeView />);
    await user.click(
      await screen.findByRole('button', { name: 'MBTI 설정하기' }),
    );

    expect(mockPush).toHaveBeenCalledWith('/mypage/settings');
  });

  it.each([
    ['MBTI 설정 사용자', { nickname: '민지', mbti: 'ENFP' }],
    ['비로그인 사용자', null],
  ])('%s에게는 설정 안내를 보여주지 않는다', (_, profile) => {
    mockUseProfile.mockReturnValue({ data: profile });

    render(<HomeView />);

    expect(
      screen.queryByRole('dialog', { name: '프로필 설정이 필요해요' }),
    ).not.toBeInTheDocument();
  });
});
