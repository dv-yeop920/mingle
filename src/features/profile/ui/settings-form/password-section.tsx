import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import type { PasswordFormValues } from '@/features/profile/model/schemas';

type PasswordSectionProps = {
  form: UseFormReturn<PasswordFormValues>;
  isPending: boolean;
  onSubmit: (data: PasswordFormValues) => void;
};

const PasswordSection = ({
  form,
  isPending,
  onSubmit,
}: PasswordSectionProps) => {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-section font-black text-foreground">비밀번호 변경</h3>
      <TextField
        label="현재 비밀번호"
        type="password"
        placeholder="현재 비밀번호 입력"
        error={form.formState.errors.currentPassword?.message}
        {...form.register('currentPassword')}
      />
      <TextField
        label="새 비밀번호"
        type="password"
        placeholder="새 비밀번호 입력"
        error={form.formState.errors.newPassword?.message}
        {...form.register('newPassword')}
      />
      <TextField
        label="비밀번호 확인"
        type="password"
        placeholder="새 비밀번호 다시 입력"
        error={form.formState.errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
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
        {isPending ? '변경 중...' : '비밀번호 변경'}
      </Button>
    </section>
  );
};

export { PasswordSection, type PasswordSectionProps };
