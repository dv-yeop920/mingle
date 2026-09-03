import { ResultActions } from '@/features/analysis-result';

type ResultActionsFooterProps = {
  isGuest: boolean;
  isSaving: boolean;
  isCheckingSavePermission: boolean;
  saveError: string | null;
  onSave: () => void;
  onRetest: () => void;
  onAddMembers?: () => void;
  onShare: () => void;
};

const ResultActionsFooter = ({
  isGuest,
  isSaving,
  isCheckingSavePermission,
  saveError,
  onSave,
  onRetest,
  onAddMembers,
  onShare,
}: ResultActionsFooterProps) => (
  <div className="flex flex-col gap-[11px] px-5 pb-[46px] pt-6">
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving || isCheckingSavePermission || !isGuest}
      className="flex h-[60px] cursor-pointer items-center justify-center rounded-[22px] bg-primary font-extrabold text-[17px] text-primary-foreground shadow-lg btn-press"
    >
      {isSaving
        ? '저장 중...'
        : isCheckingSavePermission
          ? '확인 중...'
          : isGuest
            ? '결과 저장하기'
            : '저장된 결과입니다'}
    </button>
    {saveError && (
      <p className="text-center text-caption font-bold text-caution-foreground">
        {saveError}
      </p>
    )}
    <ResultActions onRetest={onRetest} onAddMembers={onAddMembers} />
    <button
      type="button"
      onClick={onShare}
      className="flex h-[54px] cursor-pointer items-center justify-center gap-2 rounded-field bg-primary-tonal text-[14.5px] font-black text-primary-deep btn-press"
    >
      ↗ 결과 공유하기
    </button>
  </div>
);

export { ResultActionsFooter, type ResultActionsFooterProps };
