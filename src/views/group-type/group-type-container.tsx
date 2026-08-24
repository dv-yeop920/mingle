import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { fetchProfile } from '@/entities/user/api/queries';
import { isProfileComplete } from '@/entities/user/model';

import { convertProfileToSelfMemberSeed } from '@/features/test-flow';

import { GroupTypeView } from './group-type-view';

const GroupTypeContainer = async () => {
  await connection();
  const profile = await fetchProfile();

  if (profile && !isProfileComplete(profile)) {
    redirect('/mypage/settings?required=profile&redirect=/group-type');
  }

  const selfMemberSeed = profile
    ? convertProfileToSelfMemberSeed(profile)
    : null;

  return <GroupTypeView selfMemberSeed={selfMemberSeed} />;
};

export { GroupTypeContainer };
