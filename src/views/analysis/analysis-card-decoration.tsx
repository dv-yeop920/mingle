type AnalysisCardVariant = 'group' | 'compatibility' | 'profile' | 'character';

const CardDecoration = ({ variant }: { variant: AnalysisCardVariant }) => {
  if (variant === 'group') {
    return (
      <div className="relative flex h-[76px] w-[88px] items-center justify-center">
        <div className="absolute right-0 h-[68px] w-[52px] rotate-12 rounded-[16px] bg-surface/55" />
        <div className="absolute left-1 flex h-[68px] w-[52px] -rotate-6 items-center justify-center rounded-[16px] bg-surface shadow-sm">
          <span className="font-nunito text-[12px] font-black text-primary-deep">
            MIX
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'compatibility') {
    return (
      <div className="flex items-center gap-1">
        <div className="flex h-[50px] w-[40px] items-center justify-center rounded-[12px] bg-surface/80 shadow-sm">
          <span className="font-nunito text-[11px] font-black text-compat">
            ENFP
          </span>
        </div>
        <span className="text-[14px] font-black text-compat/60">×</span>
        <div className="flex h-[50px] w-[40px] items-center justify-center rounded-[12px] bg-surface/80 shadow-sm">
          <span className="font-nunito text-[11px] font-black text-compat-accent">
            INTJ
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[58px] min-w-[46px] items-center justify-center gap-1 rounded-[12px] bg-surface/80 px-2 shadow-sm">
      {variant === 'profile' ? (
        <span className="font-nunito text-[12px] font-black text-primary-deep">
          MBTI
        </span>
      ) : (
        <span className="text-[22px]">🎭 ✨</span>
      )}
    </div>
  );
};

export { CardDecoration, type AnalysisCardVariant };
