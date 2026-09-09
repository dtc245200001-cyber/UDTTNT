import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yzscfptnwecjutaobyzm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c2NmcHRud2VjanV0YW9ieXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODU4NjIsImV4cCI6MjEwMjQ2MTg2Mn0.X0vVt00d_6fUoBRR-_viywo9ts3iXFS-vLxkeh2xs2U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
