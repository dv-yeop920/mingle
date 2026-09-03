'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { clearAuthQueryCache } from '@/shared/lib/react-query/clear-auth-query-cache';
import { useGuardedAction } from '@/shared/lib/use-guarded-action';
import { useToast } from '@/shared/ui/toast';

import { deleteAccount } from '@/features/auth/api/actions';
import { DeleteAccountSheet } from '@/features/profile/ui/delete-account-sheet';

type AccountSectionProps = {
  onLogout?: () => void;
};

const AccountSection = ({ onLogout }: AccountSectionProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useToast();

  const [guardedDeleteAccount, isPending] = useGuardedAction(async () => {
    const result = await deleteAccount();
    if ('error' in result) {
      showToast({ message: result.error ?? '회원탈퇴에 실패했습니다', variant: 'error' });
      return;
    }

    await clearAuthQueryCache(queryClient);
    router.replace('/login');
  });

  return (
    <section className="flex flex-col gap-3 pt-4">
      <button
        type="button"
        onClick={onLogout}
        className="cursor-pointer text-left text-caption text-caution btn-press"
      >
        로그아웃
      </button>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="cursor-pointer text-left text-caption text-hint btn-press"
      >
        회원탈퇴
      </button>
      <DeleteAccountSheet
        isOpen={isSheetOpen}
        isPending={isPending}
        onClose={() => setIsSheetOpen(false)}
        onConfirm={guardedDeleteAccount}
      />
    </section>
  );
};

export { AccountSection, type AccountSectionProps };
