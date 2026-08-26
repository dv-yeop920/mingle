import type { Metadata } from 'next';

import { LoginView } from '@/views/login';

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const { redirect } = await searchParams;
  const redirectTo = redirect === '/result' ? redirect : undefined;

  return <LoginView redirectTo={redirectTo} />;
};

export const metadata: Metadata = { title: '로그인' };
export default LoginPage;
