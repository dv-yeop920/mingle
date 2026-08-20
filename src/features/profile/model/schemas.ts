import { z } from 'zod';

const nicknameSchema = z.object({
  nickname: z
    .string()
    .min(1, '닉네임을 입력해주세요')
    .max(8, '닉네임은 8글자 이하여야 합니다'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
    newPassword: z
      .string()
      .min(6, '비밀번호는 6자 이상이어야 합니다')
      .regex(/[a-zA-Z]/, '영문자를 포함해야 합니다')
      .regex(/[0-9]/, '숫자를 포함해야 합니다')
      .regex(/[^a-zA-Z0-9]/, '특수문자를 포함해야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type NicknameFormValues = z.infer<typeof nicknameSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export { nicknameSchema, passwordSchema };
export type { NicknameFormValues, PasswordFormValues };
