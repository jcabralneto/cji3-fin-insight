import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Fallbacks ensure the app works even if env vars aren't injected yet (e.g., cached preview)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qnumwnowahqwpvouqrbh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudW13bm93YWhxd3B2b3VxcmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjQ0NzksImV4cCI6MjA3NzE0MDQ3OX0.CdbFdjOFYmTfYpm1ketCqYd_Ozl7azdU4pESL7gFCfg';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
