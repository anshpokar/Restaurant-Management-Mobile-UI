import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const { email, otpCode, purpose } = await req.json()

    // Validate input
    if (!email || !otpCode) {
      throw new Error('Email and OTP code are required')
    }

    // Get SendGrid API key from environment
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    
    if (!sendgridApiKey) {
      throw new Error('SendGrid API key not configured')
    }

    // Prepare email content
    const emailContent = {
      personalizations: [{ to: [{ email }] }],
      from: { 
        email: Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@yourrestaurant.com',
        name: 'Restaurant Management' 
      },
      subject: `Your Verification Code - ${purpose || 'OTP'}`,
      content: [
        {
          type: 'text/plain',
          value: `Your verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`
        },
        {
          type: 'text/html',
          value: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                  .otp-code { background: white; border: 3px solid #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; margin: 20px 0; border-radius: 8px; }
                  .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                  .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🔐 Verification Code</h1>
                  </div>
                  <div class="content">
                    <p>Hello,</p>
                    <p>Your verification code is:</p>
                    <div class="otp-code">${otpCode}</div>
                    <p><strong>This code will expire in 10 minutes.</strong></p>
                    
                    <div class="warning">
                      <strong>⚠️ Important Security Notice:</strong><br>
                      • Do not share this code with anyone<br>
                      • Our staff will never ask for this code<br>
                      • If you didn't request this code, please ignore this email
                    </div>
                    
                    <p>Thank you for dining with us!</p>
                  </div>
                  <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>&copy; ${new Date().getFullYear()} Restaurant Management System</p>
                  </div>
                </div>
              </body>
            </html>
          `
        }
      ]
    }

    // Send email via SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailContent),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('SendGrid error:', errorData)
      throw new Error(`Failed to send email: ${response.status} ${response.statusText}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
