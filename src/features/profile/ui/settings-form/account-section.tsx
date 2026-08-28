'use client';

import { useState, useTransition } from 'react';

import { deleteAccount } from '@/features/auth/api/actions';
import { DeleteAccountSheet } from '@/features/profile/ui/delete-account-sheet';

type AccountSectionProps = {
  onLogout?: () => void;
};

const AccountSection = ({ onLogout }: AccountSectionProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDeleteAccount = () => {
    startTransition(async () => {
      await deleteAccount();
    });
  };

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
        onConfirm={handleDeleteAccount}
      />
    </section>
  );
};

export { AccountSection, type AccountSectionProps };
