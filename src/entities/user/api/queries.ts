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

export { fetchProfile };
