import { redirect } from 'next/navigation';
import { createServerClient } from '@udd/shared';

export default async function Home() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  } else {
    redirect('/login');
  }
}