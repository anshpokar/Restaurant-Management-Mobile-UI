// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to hash OTP using native Web Crypto (no Web Workers required)
async function hashOTP(otp: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, email, otp } = await req.json()

    // SMTP Configuration
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: Deno.env.get('SMTP_EMAIL'),
        pass: Deno.env.get('SMTP_PASS'),
      },
    })

    if (action === 'generate') {
      if (!email) throw new Error('Email is required')

      // 1. Check if email exists in profiles
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (profileError || !profile) {
        throw new Error('Customer with this email not found')
      }

      // 2. Rate limiting (max 3 OTP in 10 minutes)
      const { count } = await supabaseClient
        .from('email_otps')
        .select('*', { count: 'exact', head: true })
        .eq('email', email.toLowerCase())
        .gt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())

      if (count && count >= 3) {
        throw new Error('Too many OTP requests. Please try again after 10 minutes.')
      }

      // 3. Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const hash = await hashOTP(otpCode)

      // 4. Store in DB
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      const { error: insertError } = await supabaseClient
        .from('email_otps')
        .insert({
          email: email.toLowerCase(),
          otp_hash: hash,
          user_id: profile.id,
          expires_at: expiresAt.toISOString()
        })

      if (insertError) throw insertError

      // 5. Send Email via Gmail SMTP
      try {
        await transporter.sendMail({
          from: `"Restaurant Management" <${Deno.env.get('SMTP_EMAIL')}>`,
          to: email,
          subject: 'Your OTP Code',
          text: `Your OTP is ${otpCode}. It is valid for 5 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #4f46e5;">Verification Code</h2>
              <p>Your OTP is:</p>
              <div style="font-size: 32px; font-weight: bold; color: #4f46e5; margin: 20px 0; letter-spacing: 5px;">
                ${otpCode}
              </div>
              <p>It is valid for <strong>5 minutes</strong>.</p>
              <p style="font-size: 12px; color: #666; margin-top: 30px;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
          `
        })
      } catch (mailError: any) {
        console.error('Mail sending failed:', mailError)
        throw new Error(`SMTP Error: ${mailError.message || 'Check your Gmail App Password and Email variables.'}`)
      }

      return new Response(JSON.stringify({ success: true, message: 'OTP sent successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'verify') {
      if (!email || !otp) throw new Error('Email and OTP are required')

      // 1. Fetch latest unused OTP
      const { data: otpRecord, error: fetchError } = await supabaseClient
        .from('email_otps')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError || !otpRecord) {
        throw new Error('Invalid or expired OTP')
      }

      // 2. Brute force protection (max 5 attempts)
      if (otpRecord.attempts_count >= 5) {
        throw new Error('Too many failed attempts. Please request a new OTP.')
      }

      // 3. Verify Hash using Web Crypto
      const inputHash = await hashOTP(otp)
      const isValid = (inputHash === otpRecord.otp_hash)

      if (!isValid) {
        // Increment attempts
        await supabaseClient
          .from('email_otps')
          .update({ attempts_count: otpRecord.attempts_count + 1 })
          .eq('id', otpRecord.id)
          
        throw new Error('Invalid OTP')
      }

      // 4. Success: Mark as used and return user_id
      await supabaseClient
        .from('email_otps')
        .update({ is_used: true })
        .eq('id', otpRecord.id)

      return new Response(JSON.stringify({ success: true, user_id: otpRecord.user_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Invalid action')

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
