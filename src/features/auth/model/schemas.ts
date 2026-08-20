import { z } from 'zod';

const loginSchema = z.object({
  username: z
    .string()
    .min(1, '아이디를 입력해주세요')
    .regex(/^[a-zA-Z0-9]+$/, '영어와 숫자만 사용할 수 있습니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

const signupSchema = z
  .object({
    nickname: z
      .string()
      .min(1, '닉네임을 입력해주세요')
      .max(8, '닉네임은 8글자 이하여야 합니다'),
    username: z
      .string()
      .min(1, '아이디를 입력해주세요')
      .regex(/^[a-zA-Z0-9]+$/, '영어와 숫자만 사용할 수 있습니다'),
    password: z
      .string()
      .min(6, '비밀번호는 6자 이상이어야 합니다')
      .regex(/[a-zA-Z]/, '영문자를 포함해야 합니다')
      .regex(/[0-9]/, '숫자를 포함해야 합니다')
      .regex(/[^a-zA-Z0-9]/, '특수문자를 포함해야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

export { loginSchema, signupSchema, type LoginFormValues, type SignupFormValues };
