import { createClient } from '@/shared/lib/supabase/server';

const fetchAnalyses = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from('analyses')
    .select('*, groups(type, custom_name, members(nickname, mbti, is_self))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

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
