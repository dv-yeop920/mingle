import Link from 'next/link';

const AnalysisContent = () => {
  return (
    <div className="flex flex-col gap-3 px-5 pt-5">
      <Link
        href="/group-type"
        aria-label="MBTI 그룹 케미 테스트 시작"
        className="btn-press relative block w-full overflow-hidden rounded-hero bg-primary-hero px-6 py-[22px] shadow-sm"
      >
        <div
          aria-hidden="true"
          className="absolute right-[-10px] top-[12px] h-[78px] w-[62px] rotate-12 rounded-field bg-surface/55"
        />
        <div
          aria-hidden="true"
          className="absolute right-[18px] top-[28px] flex h-[78px] w-[62px] -rotate-6 items-center justify-center rounded-field bg-surface"
        >
          <span className="font-nunito text-[14px] font-black text-primary-deep">MIX</span>
        </div>

        <div className="relative flex max-w-[180px] flex-col gap-[6px]">
          <h2 className="text-left text-[18px] font-black leading-[1.35] text-primary-deep">
            MBTI 그룹 케미
          </h2>
          <p className="text-left text-[12px] font-bold text-primary-deep/70">
            친구·가족·팀의 MBTI 케미를{' '}
            <br />
            한눈에 확인해보세요
          </p>
        </div>
      </Link>

      <Link
        href="/compatibility"
        aria-label="1:1 MBTI 궁합 분석하기"
        className="btn-press relative block w-full overflow-hidden rounded-hero bg-compat-bg px-6 py-[22px] shadow-sm"
      >
        <div
          aria-hidden="true"
          className="absolute right-[20px] top-1/2 flex -translate-y-1/2 items-center gap-1"
        >
          <div className="flex h-[50px] w-[40px] items-center justify-center rounded-[12px] bg-white/80 shadow-sm">
            <span className="font-nunito text-[11px] font-black text-compat">ENFP</span>
          </div>
          <span className="text-[14px] font-black text-compat/60">×</span>
          <div className="flex h-[50px] w-[40px] items-center justify-center rounded-[12px] bg-white/80 shadow-sm">
            <span className="font-nunito text-[11px] font-black text-compat-accent">INTJ</span>
          </div>
        </div>

        <div className="relative flex max-w-[180px] flex-col gap-[6px]">
          <h2 className="text-left text-[18px] font-black leading-[1.35] text-compat">
            1:1 MBTI 궁합
          </h2>
          <p className="text-left text-[12px] font-bold text-compat-muted">
            두 사람의 MBTI 궁합을{' '}
            <br />
            AI가 분석해드려요
          </p>
        </div>
      </Link>

      <Link
        href="/analysis/mbti-profile"
        aria-label="나의 MBTI 분석하기"
        className="btn-press relative block w-full overflow-hidden rounded-hero bg-primary-tonal px-6 py-[22px] shadow-sm"
      >
        <div
          aria-hidden="true"
          className="absolute right-[20px] top-1/2 flex -translate-y-1/2 items-center gap-1"
        >
          <div className="flex h-[58px] w-[46px] items-center justify-center rounded-[12px] bg-white/80 shadow-sm">
            <span className="font-nunito text-[12px] font-black text-primary-deep">MBTI</span>
          </div>
        </div>

        <div className="relative flex max-w-[180px] flex-col gap-[6px]">
          <h2 className="text-left text-[18px] font-black leading-[1.35] text-primary-deep">
            나의 MBTI 분석
          </h2>
          <p className="text-left text-[12px] font-bold text-primary-deep/70">
            AI가 분석하는{' '}
            <br />
            내 MBTI 성격 프로필
          </p>
        </div>
      </Link>

      <Link
        href="/analysis/character-match"
        aria-label="애니메이션 캐릭터 매칭하기"
        className="btn-press relative block w-full overflow-hidden rounded-hero bg-insight-surface px-6 py-[22px] shadow-sm"
      >
        <div
          aria-hidden="true"
          className="absolute right-[20px] top-1/2 flex -translate-y-1/2 items-center gap-1"
        >
          <div className="flex h-[50px] w-[40px] items-center justify-center rounded-[12px] bg-white/80 shadow-sm">
            <span className="text-[22px]">🎭</span>
          </div>
          <div className="flex h-[50px] w-[40px] items-center justify-center rounded-[12px] bg-white/80 shadow-sm">
            <span className="text-[22px]">✨</span>
          </div>
        </div>

        <div className="relative flex max-w-[180px] flex-col gap-[6px]">
          <h2 className="text-left text-[18px] font-black leading-[1.35] text-insight-foreground">
            내가 애니메이션
            <br />
            캐릭터라면?
          </h2>
          <p className="text-left text-[12px] font-bold text-insight-foreground/70">
            나와 닮은 애니·영화{' '}
            <br />
            캐릭터를 찾아보세요
          </p>
        </div>
      </Link>
    </div>
  );
};

export { AnalysisContent };
