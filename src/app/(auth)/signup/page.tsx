import type { Metadata } from 'next';

import { SignupView } from '@/views/signup';

type SignupPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

const SignupPage = async ({ searchParams }: SignupPageProps) => {
  const { redirect } = await searchParams;
  const redirectTo = redirect === '/result' ? redirect : undefined;

  return <SignupView redirectTo={redirectTo} />;
};

export const metadata: Metadata = { title: '회원가입' };
export default SignupPage;
