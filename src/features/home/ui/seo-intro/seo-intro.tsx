const SEO_INTRO_ITEMS = [
  {
    title: '그룹 분위기',
    description: '함께 있을 때 자연스럽게 만들어지는 분위기를 살펴봐요.',
  },
  {
    title: '멤버 역할',
    description: '모임 안에서 각자가 편하게 맡는 역할을 알아봐요.',
  },
  {
    title: '1:1 케미',
    description: '두 사람씩 비교해 관계에서 잘 맞는 포인트를 찾아봐요.',
  },
] as const;

const SeoIntro = () => {
  return (
    <section
      aria-labelledby="seo-intro-title"
      className="px-5 pt-8 pb-3"
    >
      <div className="rounded-card-lg border border-border bg-surface p-5 shadow-sm">
        <h2
          id="seo-intro-title"
          className="text-section font-black tracking-title text-foreground"
        >
          MBTI 그룹 궁합, 무엇을 알려주나요?
        </h2>
        <p className="mt-2 text-body font-bold text-muted text-pretty">
          두 사람만 보는 궁합표가 아니라 친구·가족·회사·팀 전체 조합에서 나타나는
          관계의 흐름을 함께 분석해요.
        </p>

        <ul className="mt-4 flex flex-col gap-2.5">
          {SEO_INTRO_ITEMS.map((item) => (
            <li
              key={item.title}
              className="rounded-field bg-primary-tonal px-4 py-3"
            >
              <h3 className="text-body font-black text-primary-deep">
                {item.title}
              </h3>
              <p className="mt-0.5 text-caption font-bold text-muted-alt">
                {item.description}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t border-border-inner pt-3 text-caption font-bold text-hint text-pretty">
          MBTI는 관계를 단정하는 진단이 아니에요. 서로를 이해하고 대화를 시작하는
          참고로 활용해 주세요.
        </p>
      </div>
    </section>
  );
};

export { SeoIntro };
