'use client';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import { MbtiBadge } from '@/entities/mbti';

import type { SettingsFormProps } from './types';

const SettingsForm = ({ className }: SettingsFormProps) => {
  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">닉네임 변경</h3>
        <TextField label="닉네임" placeholder="새 닉네임 입력" defaultValue="민지" />
        <Button variant="secondary">닉네임 변경</Button>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">비밀번호 변경</h3>
        <TextField label="현재 비밀번호" type="password" placeholder="현재 비밀번호 입력" />
        <TextField label="새 비밀번호" type="password" placeholder="새 비밀번호 입력" />
        <TextField label="비밀번호 확인" type="password" placeholder="새 비밀번호 다시 입력" />
        <Button variant="secondary">비밀번호 변경</Button>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">MBTI 재설정</h3>
        <div className="flex items-center gap-3">
          <span className="text-body text-muted">현재 MBTI:</span>
          <MbtiBadge mbti="ENFP" />
        </div>
        <Button variant="tonal">MBTI 변경</Button>
      </section>

      <section className="flex flex-col gap-3 pt-4">
        <button
          type="button"
          className="cursor-pointer text-left text-caption text-caution"
        >
          로그아웃
        </button>
        <button
          type="button"
          className="cursor-pointer text-left text-caption text-hint"
        >
          회원탈퇴
        </button>
      </section>
    </div>
  );
};

export { SettingsForm };
export type { SettingsFormProps } from './types';
