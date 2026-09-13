import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

const fetchMbtiProfile = async (mbti: string) => {
  const { supabase, user } = await getAuthenticatedClient();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from('mbti_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('mbti', mbti)
    .maybeSingle();

  return data;
};

export { fetchMbtiProfile };
