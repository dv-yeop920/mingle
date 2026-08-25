import { SignupView } from '@/views/signup';

type SignupPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

const SignupPage = async ({ searchParams }: SignupPageProps) => {
  const { redirect } = await searchParams;
  const redirectTo = redirect === '/result' ? redirect : undefined;

  return <SignupView redirectTo={redirectTo} />;
};

export default SignupPage;
