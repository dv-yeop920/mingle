'use client';

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
          <button
            onClick={reset}
            className="h-[54px] w-full cursor-pointer rounded-field bg-primary text-[16px] font-extrabold text-primary-foreground"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
