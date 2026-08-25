import { z } from 'zod';

const analysisTitleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '테스트 제목을 입력해 주세요.')
    .max(30, '테스트 제목은 30자 이하로 입력해 주세요.'),
});

const saveOperationIdSchema = z
  .string()
  .uuid('저장 요청 정보가 올바르지 않아요.');

type AnalysisTitleFormValues = z.infer<typeof analysisTitleSchema>;

export {
  analysisTitleSchema,
  saveOperationIdSchema,
  type AnalysisTitleFormValues,
};
