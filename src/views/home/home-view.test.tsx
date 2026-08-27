import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeView } from './home-view';

vi.mock('./home-reset-effect', () => ({
  HomeResetEffect: () => null,
}));

vi.mock('./recent-tests-section', () => ({
  RecentTestsSection: () => <div>최근 테스트</div>,
}));

describe('HomeView', () => {
  it('로그인 사용자의 MBTI가 없으면 설정 안내를 보여준다', async () => {
    render(
      <HomeView nickname="민지" isMbtiSetupRequired />,
    );

    expect(
      await screen.findByRole('dialog', { name: '프로필 설정이 필요해요' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('MBTI를 설정하고 이용해 주세요'),
    ).toBeInTheDocument();
  });

  it('MBTI 설정하기 링크가 설정 페이지로 연결된다', async () => {
    render(
      <HomeView nickname="민지" isMbtiSetupRequired />,
    );

    const link = await screen.findByRole('link', { name: 'MBTI 설정하기' });
    expect(link).toHaveAttribute('href', '/mypage/settings');
  });

  it('MBTI가 설정된 사용자에게는 설정 안내를 보여주지 않는다', () => {
    render(
      <HomeView nickname="민지" isMbtiSetupRequired={false} />,
    );

    expect(
      screen.queryByRole('dialog', { name: '프로필 설정이 필요해요' }),
    ).not.toBeInTheDocument();
  });

  it('비로그인 사용자에게는 설정 안내를 보여주지 않는다', () => {
    render(
      <HomeView nickname={null} isMbtiSetupRequired={false} />,
    );

    expect(
      screen.queryByRole('dialog', { name: '프로필 설정이 필요해요' }),
    ).not.toBeInTheDocument();
  });

  it('닉네임이 있으면 인사 메시지에 이름을 표시한다', () => {
    render(
      <HomeView nickname="민지" isMbtiSetupRequired={false} />,
    );

    expect(screen.getByText('민지님 👋')).toBeInTheDocument();
  });

  it('비로그인 상태에서 기본 인사 메시지를 표시한다', () => {
    render(
      <HomeView nickname={null} isMbtiSetupRequired={false} />,
    );

    expect(screen.getByText('안녕하세요 👋')).toBeInTheDocument();
  });
});
