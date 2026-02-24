import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Manually parse .env
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testResolution(username) {
  console.log(`Testing resolution for: ${username}`);
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('username', username)
      .maybeSingle();

    const duration = Date.now() - start;
    console.log(`Query took ${duration}ms`);

    if (error) {
      console.error('Error:', error);
    } else if (data) {
      console.log('Success! Found:', data);
    } else {
      console.log('User not found');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testResolution('admin9665');
