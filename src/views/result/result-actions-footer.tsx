import { Button } from '@/shared/ui/button';

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
    <Button
      variant="primary"
      onClick={onSave}
      disabled={isSaving || isCheckingSavePermission || !isGuest}
    >
      {isSaving
        ? '저장 중...'
        : isCheckingSavePermission
          ? '확인 중...'
          : isGuest
            ? '결과 저장하기'
            : '저장된 결과입니다'}
    </Button>
    {saveError && (
      <p className="text-center text-caption font-bold text-caution-foreground">
        {saveError}
      </p>
    )}
    <ResultActions onRetest={onRetest} onAddMembers={onAddMembers} />
    <Button variant="tonal" onClick={onShare}>
      ↗ 결과 공유하기
    </Button>
  </div>
);

export { ResultActionsFooter, type ResultActionsFooterProps };
