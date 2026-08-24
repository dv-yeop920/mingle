import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { fetchProfile } from '@/entities/user/api/queries';
import { isProfileComplete } from '@/entities/user/model';

import { MemberSetupView } from './member-setup-view';

const MemberSetupContainer = async () => {
  await connection();
  const profile = await fetchProfile();

  if (profile && !isProfileComplete(profile)) {
    redirect('/mypage/settings?required=profile&redirect=/group-type');
  }

  return <MemberSetupView />;
};

export { MemberSetupContainer };
