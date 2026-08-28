import { createClient } from '@/shared/lib/supabase/server';
import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

const fetchAnalyses = async (groupType?: string) => {
  const { supabase, user } = await getAuthenticatedClient();

  if (!user) {
    return [];
  }

  let query = supabase
    .from('analyses')
    .select(
      '*, groups!inner(type, custom_name, members(nickname, mbti, is_self))',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (groupType) {
    query = query.eq('groups.type', groupType);
  }

  const { data } = await query;

  return data ?? [];
};

const fetchAnalysisById = async (id: string) => {
  const supabase = await createClient();

  const { data } = await supabase
    .from('analyses')
    .select('*, groups(type, custom_name, members(nickname, mbti, gender, is_self, order))')
    .eq('id', id)
    .maybeSingle();

  return data;
};

export { fetchAnalyses, fetchAnalysisById };
