-- =====================================================
-- TABLE: email_otps
-- =====================================================
-- This table stores hashed OTPs for custom email verification.
-- It is intentionally separate from Supabase Auth OTP to allow
-- verification without creating an auth session.

CREATE TABLE IF NOT EXISTS public.email_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    attempts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON public.email_otps(expires_at);

-- RLS: Only service_role (edge functions) should manage this table directly.
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Note: We don't add public policies because this table is only 
-- accessed via service_role in Edge Functions for security.
-- If you need to debug in the dashboard, you can see it there.

-- Optional: Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.email_otps
    WHERE expires_at < now() OR (is_used = true AND created_at < now() - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;
