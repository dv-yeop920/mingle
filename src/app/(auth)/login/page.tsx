import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoginView } from '@/views/login';

type LoginSearchParams = {
  searchParams: Promise<{ redirect?: string }>;
};

const LoginContent = async ({ searchParams }: LoginSearchParams) => {
  const { redirect } = await searchParams;
  const redirectTo = redirect === '/result' ? redirect : undefined;

  return <LoginView redirectTo={redirectTo} />;
};

const LoginPage = ({ searchParams }: LoginSearchParams) => (
  <Suspense>
    <LoginContent searchParams={searchParams} />
  </Suspense>
);

export const metadata: Metadata = { title: '로그인' };
export default LoginPage;
