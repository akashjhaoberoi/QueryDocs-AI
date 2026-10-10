import { createServerSupabaseClient } from '../db/supabase-server';

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (e) {
    console.warn('Supabase auth session check warning:', e);
  }

  if (process.env.NODE_ENV === 'development') {
    return 'test-user-123';
  }

  return null;
}

export async function requireAdmin(): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  
  // In a real production app, verify against a role table or JWT claim.
  // For this secure implementation, we check if the user is explicitly set as admin in env,
  // or verify against a secure role table.
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from('users').select('role').eq('id', userId).single();
    if (data && data.role === 'admin') {
      return true;
    }
  } catch (e) {
    // If the table doesn't exist, fallback to an env var for admin ID for bootstrapping
    if (process.env.ADMIN_USER_ID && userId === process.env.ADMIN_USER_ID) {
      return true;
    }
  }
  return false;
}
