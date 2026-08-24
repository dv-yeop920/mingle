type AccountSectionProps = {
  onLogout?: () => void;
};

const AccountSection = ({ onLogout }: AccountSectionProps) => {
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
        disabled
        className="text-left text-caption text-hint opacity-50"
      >
        회원탈퇴 (준비 중)
      </button>
    </section>
  );
};

export { AccountSection, type AccountSectionProps };
