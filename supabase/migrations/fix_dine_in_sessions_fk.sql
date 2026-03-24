-- Add foreign key relationship from dine_in_sessions to profiles
-- This allows Supabase (PostgREST) to automatically join these tables
-- using syntax like .select('*, profiles(*)')

ALTER TABLE public.dine_in_sessions
ADD CONSTRAINT dine_in_sessions_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;
