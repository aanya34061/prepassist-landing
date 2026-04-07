import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pjubvuvqzwhvqxeeubcv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWJ2dXZxendodnF4ZWV1YmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDU0NjYsImV4cCI6MjA4MzcyMTQ2Nn0.S6c_saGG8tVNvAegb8e9eP3d5PbPlY0BLDnM0HR5n_0';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
