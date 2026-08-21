import Link from 'next/link';

const NotFound = () => {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col items-center justify-center gap-4 bg-background px-6">
      <p className="font-nunito text-display font-black text-primary">404</p>
      <p className="text-body text-muted">페이지를 찾을 수 없습니다</p>
      <Link
        href="/"
        className="flex h-[54px] w-full items-center justify-center rounded-field bg-primary text-[16px] font-extrabold text-primary-foreground"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
};

export default NotFound;
