// Basic Supabase client (v2)
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  window.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  window.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
