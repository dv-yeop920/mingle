import { createClient } from '@/shared/lib/supabase/server';

const fetchProfile = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
};

const fetchUserStats = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [analysesResult, groupsResult] = await Promise.all([
    supabase
      .from('analyses')
      .select('chemistry_score')
      .eq('user_id', user.id),
    supabase
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const analyses = analysesResult.data ?? [];
  const testCount = analyses.length;
  const groupCount = groupsResult.count ?? 0;
  const avgChemistry =
    testCount > 0
      ? Math.round(
          analyses.reduce((sum, a) => sum + a.chemistry_score, 0) / testCount,
        )
      : 0;

  return {
    totalTests: testCount,
    totalGroups: groupCount,
    averageChemistry: avgChemistry,
  };
};

export { fetchProfile, fetchUserStats };
