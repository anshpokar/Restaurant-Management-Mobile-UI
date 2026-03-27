# 📧 SUPABASE EMAIL SETUP FOR OTP VERIFICATION

## ✅ COMPLETE SETUP GUIDE

This guide will help you configure Supabase to send real emails for OTP verification using SendGrid.

---

## 🎯 OVERVIEW

**What We're Setting Up:**
1. ✅ SendGrid account & API key
2. ✅ Supabase Edge Function for sending emails
3. ✅ Integration with OTP verification screens
4. ✅ Beautiful HTML email templates

**Flow:**
```
Waiter enters customer email
    ↓
System generates 6-digit OTP
    ↓
Stores OTP in database (expires in 10 min)
    ↓
Calls Supabase Edge Function
    ↓
Edge Function sends email via SendGrid
    ↓
Customer receives professional email with OTP
```

---

## 📋 STEP-BY-STEP SETUP

### **Step 1: Create SendGrid Account**

1. **Sign Up**
   - Go to [https://sendgrid.com](https://sendgrid.com)
   - Click "Sign Up Free"
   - Fill in your details
   - Verify your email address

2. **Complete Onboarding**
   - Answer the onboarding questions
   - Choose "Small Business" or "Personal"
   - Select your use case (Email Verification/OTP)

3. **Verify Sender Identity**
   - Go to **Settings** → **Sender Authentication**
   - Click "Authenticate"
   - Choose "Single Sender Verification"
   - Enter your sender details:
     - **From Email**: `noreply@yourrestaurant.com` (or your domain email)
     - **From Name**: `Restaurant Management`
     - **Reply-To**: Your support email
   - Complete email verification

---

### **Step 2: Generate SendGrid API Key**

1. **Navigate to API Keys**
   - In SendGrid Dashboard, go to **Settings** → **API Keys**

2. **Create API Key**
   - Click **"Create API Key"**
   - **Name**: `Restaurant OTP System`
   - **Permissions**: Select **"Mail Send"** (Full Access)
   - Click **"Create & View"**

3. **Copy API Key**
   - Copy the API key immediately (starts with `SG.`)
   - **⚠️ Important:** You can only view it once!
   - Save it securely

---

### **Step 3: Configure Supabase Secrets**

1. **Open Supabase Dashboard**
   - Go to your project at [https://supabase.com](https://supabase.com)
   - Select your restaurant project

2. **Navigate to Edge Functions**
   - In left sidebar, click **"Edge Functions"**
   - Click **"Secrets"** tab

3. **Create Secret**
   - Click **"Create new secret"**
   - **Name**: `SENDGRID_API_KEY`
   - **Value**: Paste your SendGrid API key (the `SG.xxxxx` string)
   - Click **"Save"**

---

### **Step 4: Deploy Edge Function**

**Files Already Created:**
- ✅ `supabase/functions/send-otp-email/index.ts`

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```
   - This opens browser for authentication

3. **Link Project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   - Find project ref in Supabase Dashboard → Settings → General
   - It's the last part of your project URL

4. **Deploy Edge Function**
   ```bash
   supabase functions deploy send-otp-email
   ```

5. **Set Environment Variables**
   ```bash
   supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   ```
   - Replace with your actual SendGrid API key

---

### **Step 5: Update From Email Address**

**Important:** Update the sender email in the edge function:

**File:** `supabase/functions/send-otp-email/index.ts`

**Find this line (around line 37):**
```typescript
from: { 
  email: 'noreply@yourrestaurant.com', // ← CHANGE THIS
  name: 'Restaurant Management' 
},
```

**Replace with:**
```typescript
from: { 
  email: 'your-verified-sender@domain.com', // Your SendGrid verified email
  name: 'Restaurant Management' 
},
```

---

### **Step 6: Test Email Sending**

1. **Test Edge Function Locally** (Optional)
   ```bash
   supabase functions serve send-otp-email
   
   # In another terminal, test the function:
   curl -i --location --request POST 'http://localhost:54321/functions/v1/send-otp-email' \
     --header 'Authorization: Bearer YOUR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data-raw '{
       "email": "test@example.com",
       "otpCode": "123456",
       "purpose": "test"
     }'
   ```

2. **Test in Application**
   - Run your app: `npm run dev`
   - Navigate to waiter section
   - Select empty table
   - Choose "Already a Customer"
   - Enter test email address
   - Click "Send OTP"
   - Check email inbox

---

## 🧪 TESTING CHECKLIST

### Email Delivery Test:

- [ ] **Email Sent Successfully**
  - No errors in console
  - Success message shown
  
- [ ] **Email Received**
  - Check inbox (wait up to 1 minute)
  - Check spam/junk folder
  
- [ ] **Email Content Correct**
  - OTP code visible
  - Professional formatting
  - Restaurant branding
  
- [ ] **OTP Code Works**
  - Can verify with entered code
  - Code expires after 10 minutes
  
- [ ] **Resend Works**
  - 60-second cooldown active
  - New code sent successfully

---

## 🔧 TROUBLESHOOTING

### Issue 1: "SendGrid API key not configured"

**Cause:** Secret not set properly

**Fix:**
```bash
# Verify secret is set
supabase secrets list

# If missing, set it again
supabase secrets set SENDGRID_API_KEY=SG.xxxxx
```

---

### Issue 2: "Failed to send email: 401 Unauthorized"

**Cause:** Invalid API key

**Fix:**
1. Go to SendGrid Dashboard
2. Generate new API key
3. Update Supabase secret
4. Redeploy function

---

### Issue 3: "Email not received"

**Possible Causes:**
- SendGrid sender not verified
- Email went to spam
- Wrong email address

**Fix:**
1. Verify sender in SendGrid dashboard
2. Check spam folder
3. Use a different email provider (Gmail, Outlook)
4. Wait up to 5 minutes for delivery

---

### Issue 4: "Function not found"

**Cause:** Edge function not deployed

**Fix:**
```bash
# Deploy the function
supabase functions deploy send-otp-email

# Verify deployment
supabase functions list
```

---

## 📊 MONITORING & ANALYTICS

### SendGrid Dashboard:

**View Email Stats:**
1. Go to SendGrid Dashboard
2. Click **"Email Activity"**
3. See all sent emails
4. Check delivery status
5. View open/click rates

**Common Metrics:**
- ✅ Delivered
- ⏳ Processing
- ❌ Failed/Bounced
- 📧 Opened
- 🔗 Clicked

---

### Supabase Logs:

**View Function Logs:**
```bash
# Stream logs in real-time
supabase functions logs send-otp-email

# Or view in dashboard
Supabase Dashboard → Edge Functions → Logs
```

---

## 🎨 CUSTOMIZATION

### Change Email Template:

**Edit:** `supabase/functions/send-otp-email/index.ts`

**Find the HTML section** (around line 50-100)

**Customize:**
- Colors (change `#667eea` to your brand color)
- Logo (add `<img>` tag in header)
- Text content
- Footer information

### Example: Add Restaurant Logo

```html
<div class="header">
  <img src="https://your-domain.com/logo.png" alt="Logo" style="max-width: 200px; margin-bottom: 20px;">
  <h1>🔐 Verification Code</h1>
</div>
```

---

## 🔒 SECURITY BEST PRACTICES

### 1. **Rate Limiting**

Add to edge function:
```typescript
// Check recent OTP requests for this email
const { data: recentRequests } = await supabase
  .from('otp_verifications')
  .select('created_at')
  .eq('email', email)
  .gt('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
  .order('created_at', { ascending: false });

if (recentRequests && recentRequests.length >= 3) {
  throw new Error('Too many requests. Please wait.');
}
```

### 2. **IP Blocking**

Block suspicious IPs after too many failed attempts.

### 3. **Secure API Key**

- Never commit API keys to git
- Use environment variables only
- Rotate keys periodically

---

## 💰 SENDGRID PRICING

### Free Tier (Perfect for Testing):
- ✅ **100 emails/day**
- ✅ **3,000 emails/month**
- ✅ Unlimited contacts
- ✅ Email activity feed

### Paid Plans (When You Scale):
- **Essentials**: $19.95/month (40,000 emails)
- **Pro**: $89.95/month (100,000 emails)

**Most restaurants start with Free tier and upgrade as needed.**

---

## 📱 ALTERNATIVE EMAIL PROVIDERS

If you prefer other providers:

### **Resend** (Developer-friendly)
- Website: [https://resend.com](https://resend.com)
- Free: 3,000 emails/month
- Better deliverability

### **AWS SES** (Cheapest at scale)
- Very cheap ($0.10 per 1,000 emails)
- More complex setup
- Requires AWS account

### **Postmark** (Best deliverability)
- Excellent reputation
- Fast delivery
- $15/month for 10,000 emails

---

## ✅ FINAL CHECKLIST

Before going live:

- [ ] SendGrid account created
- [ ] Sender identity verified
- [ ] API key generated and saved
- [ ] Supabase secret configured
- [ ] Edge function deployed
- [ ] From email updated in code
- [ ] Test email sent successfully
- [ ] OTP verification works
- [ ] Rate limiting tested
- [ ] Error handling works
- [ ] Logs monitored

---

## 🎉 YOU'RE DONE!

Once everything is set up:

1. **Customers receive professional emails**
2. **OTP codes work correctly**
3. **Emails have your branding**
4. **System is secure and reliable**

**Next:** The system will automatically send emails when waiters request OTP verification!

---

## 📞 SUPPORT RESOURCES

### SendGrid Documentation:
- [API Docs](https://docs.sendgrid.com/api-reference/)
- [Email Setup Guide](https://docs.sendgrid.com/for-developers/sending-email)
- [Authentication Guide](https://docs.sendgrid.com/for-developers/sending-email/sender-authentication)

### Supabase Documentation:
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Secrets Management](https://supabase.com/docs/guides/functions/secrets)

### Need Help?
- Check SendGrid Email Activity for delivery issues
- Review Supabase Function Logs for errors
- Test with different email providers

---

**Status:** Ready to send real emails! 🚀  
**Estimated Setup Time:** 15-20 minutes  
**Cost:** FREE (up to 3,000 emails/month)
