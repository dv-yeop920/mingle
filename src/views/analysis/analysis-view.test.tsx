import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnalysisView } from './analysis-view';

describe('AnalysisView', () => {
  it('MBTI 분석을 고를 수 있는 제목과 안내를 제공한다', () => {
    render(<AnalysisView />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '나에게 맞는 MBTI 분석 찾기',
      }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      'MBTI 그룹 궁합 테스트',
      '1:1 MBTI 연애 궁합',
      '나의 MBTI 성격 분석',
      'MBTI 캐릭터 매칭',
    ]);
    expect(
      screen.getByText(/여러 명의 그룹 관계부터 두 사람의 궁합/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/여러 명이 함께라면 그룹 궁합을/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/성격이나 관계를 단정하는 진단이 아니라/),
    ).toBeInTheDocument();
  });

  it.each([
    ['MBTI 그룹 궁합 테스트 시작', '/group-type'],
    ['1:1 MBTI 연애 궁합 시작', '/compatibility'],
    ['나의 MBTI 성격 분석 시작', '/analysis/mbti-profile'],
    ['MBTI 캐릭터 매칭 시작', '/analysis/character-match'],
    ['MBTI 그룹 궁합 테스트 자세히 보기', '/'],
  ])('%s 링크를 %s 경로로 제공한다', (name, href) => {
    render(<AnalysisView />);

    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
  });
});
