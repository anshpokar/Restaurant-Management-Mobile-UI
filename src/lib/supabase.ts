import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('--- SUPABASE CONFIG DEBUG ---');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseAnonKey?.length || 0);
console.log('-----------------------------');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  const errorMsg = 'CRITICAL: Supabase environment variables are missing or invalid! ' + 
                   'Please check your .env file and RESTART your terminal (npm run dev).';
  console.error(errorMsg);
  // Only alert in browser to avoid blocking build/test
  if (typeof window !== 'undefined') {
    alert(errorMsg);
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid-url.supabase.co', 
  supabaseAnonKey || 'invalid-key'
);

export type UserRole = 'admin' | 'customer' | 'delivery';

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  phone_number: string;
  role: UserRole;
  email: string;
}
