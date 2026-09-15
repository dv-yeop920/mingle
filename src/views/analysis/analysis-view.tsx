import Link from 'next/link';

import { AnalysisContent } from './analysis-content';

type AnalysisViewProps = {
  className?: string;
};

const AnalysisView = ({ className }: AnalysisViewProps) => {
  return (
    <div className={className}>
      <header className="px-5 pt-5">
        <h1 className="text-title2 font-black tracking-title text-foreground">
          나에게 맞는 MBTI 분석 찾기
        </h1>
        <p className="mt-2 text-body font-semibold text-muted text-pretty">
          여러 명의 그룹 관계부터 두 사람의 궁합, 나의 성격과 닮은 캐릭터까지
          원하는 MBTI 분석을 한곳에서 골라보세요.
        </p>
      </header>
      <AnalysisContent />

      <div className="mx-5 mt-5 rounded-card bg-surface p-5 shadow-sm">
        <p className="text-body font-bold text-foreground text-pretty">
          여러 명이 함께라면 그룹 궁합을, 두 사람의 관계가 궁금하다면 1:1 궁합을
          선택해 보세요. 나를 더 알고 싶을 때는 성격 분석이나 캐릭터 매칭이 잘
          맞아요.
        </p>
        <Link
          href="/"
          className="mt-3 inline-flex min-h-[44px] items-center rounded-[16px] px-1 text-body font-black text-primary-deep underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-deep"
        >
          MBTI 그룹 궁합 테스트 자세히 보기
        </Link>
      </div>

      <p className="mx-6 mt-4 text-caption font-semibold leading-[1.6] text-muted text-pretty">
        MIXTI의 MBTI 분석은 성격이나 관계를 단정하는 진단이 아니라, 서로를
        이해하고 대화를 시작하는 데 도움을 주는 참고 정보예요.
      </p>
    </div>
  );
};

export { AnalysisView, type AnalysisViewProps };
