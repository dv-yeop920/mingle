import { z } from 'zod';

const NICKNAME_REGEX = /^[가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ]*$/;

const memberNicknameSchema = z
  .string()
  .min(1, '닉네임을 입력해주세요')
  .max(8, '8글자 이하')
  .regex(NICKNAME_REGEX, '한글과 영어만 입력 가능');

export { memberNicknameSchema };
