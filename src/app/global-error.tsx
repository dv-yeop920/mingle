'use client';

import { Button } from '@/shared/ui/button';

const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col items-center justify-center gap-4 bg-background px-6">
          <p className="text-title2 font-black text-foreground">
            문제가 발생했습니다
          </p>
          <p className="text-body text-muted">{error.message}</p>
          <Button variant="primary" onClick={reset}>
            다시 시도
          </Button>
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
