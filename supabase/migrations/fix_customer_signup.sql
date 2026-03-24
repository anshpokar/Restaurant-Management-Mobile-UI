-- =====================================================
-- TRIGGER: AUTOMATIC PROFILE CREATION
-- =====================================================
-- This trigger automatically creates a row in the public.profiles table
-- whenever a new user is created in auth.users.
-- It extracts metadata (full_name, username, phone_number, role)
-- from the raw_user_meta_data field.

-- 1. Create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, phone_number, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure INSERT policy exists for the profile (if manual insertion is still needed, 
-- but trigger handles it now)
-- However, we still need to allow the trigger to work (SECURITY DEFINER handles this).
-- We can also add an INSERT policy for waiters if helpful, but trigger is cleaner.

-- 4. Update profiles RLS to allow authenticated users to view all (already exists in some fixes)
-- But ensuring WAITERS and ADMINS can definitely see everything.
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
CREATE POLICY "Staff can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'waiter')
  )
);
