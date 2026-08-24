import type { Gender } from '@/shared/types/gender';
import { Chip } from '@/shared/ui/chip';

type GenderSectionProps = {
  gender: Gender | null;
  isPending?: boolean;
  onGenderSelect: (gender: Gender) => void;
};

const GENDER_OPTIONS = [
  { value: 'male', label: '남' },
  { value: 'female', label: '여' },
  { value: 'other', label: '그 외' },
] as const;

const GenderSection = ({
  gender,
  isPending = false,
  onGenderSelect,
}: GenderSectionProps) => {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-section font-black text-foreground">성별 설정</h3>
      <div className="flex items-center gap-2">
        {GENDER_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            isActive={gender === option.value}
            onClick={() => {
              if (!isPending) {
                onGenderSelect(option.value);
              }
            }}
            className="px-3 py-[7px]"
          />
        ))}
      </div>
    </section>
  );
};

export { GenderSection, type GenderSectionProps };
