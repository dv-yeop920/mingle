import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SignupView } from '@/views/signup';

type SignupPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

const SignupContent = async ({ searchParams }: SignupPageProps) => {
  const { redirect } = await searchParams;
  const redirectTo = redirect === '/result' ? redirect : undefined;

  return <SignupView redirectTo={redirectTo} />;
};

const SignupPage = ({ searchParams }: SignupPageProps) => (
  <Suspense>
    <SignupContent searchParams={searchParams} />
  </Suspense>
);

export const metadata: Metadata = { title: '회원가입' };
export default SignupPage;
