import { AnalysisCard } from './analysis-card';

const AnalysisContent = () => {
  return (
    <div className="flex flex-col gap-3 px-5 pt-5">
      <AnalysisCard
        href="/group-type"
        ariaLabel="MBTI 그룹 궁합 테스트 시작"
        title="MBTI 그룹 궁합 테스트"
        description="친구·가족·팀 여러 명의 분위기와 역할, 멤버별 케미를 함께 확인해요."
        variant="group"
      />
      <AnalysisCard
        href="/compatibility"
        ariaLabel="1:1 MBTI 궁합 분석 시작"
        title="1:1 MBTI 궁합 분석"
        description="두 사람이 잘 맞는 점과 대화 방식, 조심하면 좋은 갈등 포인트를 알아봐요."
        variant="compatibility"
      />
      <AnalysisCard
        href="/analysis/mbti-profile"
        ariaLabel="나의 MBTI 성격 분석 시작"
        title="나의 MBTI 성격 분석"
        description="나의 MBTI 성향과 강점, 관계에서 드러나는 특징을 자세히 살펴봐요."
        variant="profile"
      />
      <AnalysisCard
        href="/analysis/character-match"
        ariaLabel="MBTI 캐릭터 매칭 시작"
        title="MBTI 캐릭터 매칭"
        description="내 성향과 닮은 애니메이션·영화 캐릭터를 찾아 재미있게 비교해요."
        variant="character"
      />
    </div>
  );
};

export { AnalysisContent };
