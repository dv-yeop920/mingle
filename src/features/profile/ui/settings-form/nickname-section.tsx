import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import type { NicknameFormValues } from '@/features/profile/model/schemas';

type NicknameSectionProps = {
  form: UseFormReturn<NicknameFormValues>;
  isPending: boolean;
  onSubmit: (data: NicknameFormValues) => void;
};

const NicknameSection = ({
  form,
  isPending,
  onSubmit,
}: NicknameSectionProps) => {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-section font-black text-foreground">닉네임 변경</h3>
      <TextField
        label="닉네임"
        placeholder="새 닉네임 입력"
        error={form.formState.errors.nickname?.message}
        {...form.register('nickname')}
      />
      {form.formState.errors.root && (
        <p className="text-caption font-bold text-caution-foreground">
          {form.formState.errors.root.message}
        </p>
      )}
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={form.handleSubmit(onSubmit)}
      >
        {isPending ? '변경 중...' : '닉네임 변경'}
      </Button>
    </section>
  );
};

export { NicknameSection, type NicknameSectionProps };
