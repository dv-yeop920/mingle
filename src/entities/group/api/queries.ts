import { createClient } from '@/shared/lib/supabase/server';

const fetchGroups = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from('groups')
    .select('*, members(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return data ?? [];
};

const fetchGroupById = async (id: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from('groups')
    .select('*, members(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  return data;
};

export { fetchGroupById, fetchGroups };
