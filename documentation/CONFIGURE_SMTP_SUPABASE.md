# 📧 HOW TO CONFIGURE SMTP IN SUPABASE DASHBOARD

## ✅ COMPLETE STEP-BY-STEP GUIDE

This guide will help you configure SMTP in Supabase so that **signup verification emails** and **OTP emails** are sent properly.

---

## 🎯 WHY CONFIGURE SMTP?

By default, Supabase uses **shared email service** which:
- ❌ May not send emails reliably in production
- ❌ Uses generic "no-reply@supabase.co" sender
- ❌ Has rate limits
- ❌ Emails may go to spam

**With custom SMTP:**
- ✅ Professional branded emails (from your domain)
- ✅ Better deliverability
- ✅ Higher rate limits
- ✅ Full control over email settings

---

## 📋 OPTION 1: USE GMAIL SMTP (EASIEST - FREE)

### **Step 1: Prepare Your Gmail Account**

1. **Enable 2-Factor Authentication** on your Google account
   - Go to: https://myaccount.google.com/security
   - Enable 2-FA if not already enabled

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)"
   - Enter: "Supabase"
   - Click **Generate**
   - **Copy the 16-character password** (example: `abcd efgh ijkl mnop`)
   - Remove spaces: `abcdefghijklmnop`

### **Step 2: Configure Supabase SMTP**

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `ppjtecxvpjblisxfnztz`

2. **Go to Auth Settings**
   - Click **Authentication** in left sidebar
   - Click **Policies** tab
   - Scroll down to **SMTP Settings** section
   - Or go directly to: `https://supabase.com/dashboard/project/ppjtecxvpjblisxfnztz/auth/smtp`

3. **Enter SMTP Configuration**

```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: abcdefghijklmnop  (your app password, no spaces)
Sender Email: your-email@gmail.com
Sender Name: Restaurant Management
```

4. **Click "Save"**

### **Step 3: Test Email Sending**

1. Go to Supabase Dashboard → Authentication → Users
2. Click **"Add user"** button
3. Enter test email address
4. Check if email arrives

---

## 📋 OPTION 2: USE SENDGRID (PROFESSIONAL - RECOMMENDED)

### **Why SendGrid?**
- ✅ Free 100 emails/day forever
- ✅ Professional deliverability
- ✅ Email analytics
- ✅ Custom sender domain
- ✅ Better than Gmail for production

### **Step 1: Create SendGrid Account**

1. Go to https://sendgrid.com
2. Click **"Sign Up Free"**
3. Fill in details:
   - Email: Your business email
   - Password: Create strong password
   - Username: Your choice
4. Verify your email address
5. Complete account setup questions

### **Step 2: Verify Sender Identity**

1. In SendGrid dashboard, go to:
   **Settings** → **Sender Authentication**

2. Click **"Verify a Sender"**

3. Fill in form:
   ```
   From Email: noreply@yourrestaurant.com
   From Name: Restaurant Management
   Reply-To: support@yourrestaurant.com
   ```

4. Click **"Verify"**
5. Check your email inbox for verification link
6. Click verification link in email

### **Step 3: Create API Key**

1. Go to: **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name: `Supabase OTP`
4. Select permissions: **Full Access**
5. Click **"Create & View"**
6. **COPY THE API KEY** (starts with `SG.`)
   - Example: `SG.xxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyy`
   - ⚠️ **You can only see it once!**

### **Step 4: Configure Supabase Edge Function**

Open terminal in your project folder:

```bash
# Login to Supabase (if not already)
supabase login

# Link to your project
supabase link --project-ref ppjtecxvpjblisxfnztz

# Set SendGrid secret
supabase secrets set SENDGRID_API_KEY=SG.xxxxx...

# Deploy Edge Function
supabase functions deploy send-otp-email
```

### **Step 5: Update Edge Function Sender Email**

Edit file: `supabase/functions/send-otp-email/index.ts` line 34

Change:
```typescript
from: { 
  email: 'noreply@yourrestaurant.com', // ← CHANGE THIS
  name: 'Restaurant Management' 
}
```

To your verified SendGrid email:
```typescript
from: { 
  email: 'your-verified@email.com',
  name: 'Restaurant Management' 
}
```

### **Step 6: Test Email**

Run your app and try signing up! Customer should receive beautiful HTML email.

---

## 📋 OPTION 3: USE OUTLOOK/HOTMAIL SMTP (FREE ALTERNATIVE)

### **Configuration:**

```
Host: smtp-mail.outlook.com
Port: 587
Username: your-outlook@hotmail.com
Password: your-app-password (generate from Microsoft account security)
Sender Email: your-outlook@hotmail.com
Sender Name: Restaurant Management
```

### **Generate App Password:**
1. Go to: https://account.microsoft.com/security
2. Enable 2-factor authentication
3. Go to: https://account.microsoft.com/security/advanced-security
4. Find **"App passwords"** section
5. Click **"Create a new app password"**
6. Copy the password (no spaces)

---

## 📋 OPTION 4: USE CUSTOM DOMAIN EMAIL (MOST PROFESSIONAL)

### **Requirements:**
- Domain name (e.g., `yourrestaurant.com`)
- Email hosting (can use Gmail, Outlook, or your own server)

### **Gmail with Custom Domain:**

If you have Google Workspace:
```
Host: smtp.gmail.com
Port: 587
Username: you@yourrestaurant.com
Password: your-google-workspace-password
Sender Email: you@yourrestaurant.com
Sender Name: Restaurant Management
```

---

## 🔧 TROUBLESHOOTING

### **"Invalid credentials" error:**

**Gmail:**
- Make sure you're using **App Password**, not regular password
- Remove all spaces from app password
- Ensure 2-FA is enabled on Google account

**SendGrid:**
- Verify API key starts with `SG.`
- Make sure sender email is **verified** in SendGrid
- Check API key has **Full Access** permissions

### **"Connection timeout" error:**

Check firewall settings allow outbound connections on port 587

### **"Authentication failed" error:**

Double-check:
- Username matches email exactly
- Password is correct (no typos)
- Port is 587 (not 465 or 25)
- Host is correct for your provider

### **Emails going to spam:**

1. Use professional sender name (not "no-reply")
2. Use custom domain email (better reputation)
3. Ask recipients to whitelist your email
4. Don't use suspicious subject lines

### **Rate limiting:**

**Gmail Free:**
- 500 emails/day limit
- 100 emails/hour limit

**SendGrid Free:**
- 100 emails/day limit
- No hourly limit

**Production Recommendation:**
Upgrade to SendGrid Essentials ($15/month) for 40,000 emails/month

---

## 🧪 TESTING EMAIL DELIVERY

### **Test 1: Signup Email**

1. Open your app
2. Go to signup page
3. Enter new email address
4. Complete signup form
5. Check email inbox for verification link

**Expected:**
```
Subject: Confirm Your Email
From: Restaurant Management <your-sender@email.com>
Body: Please confirm your email by clicking the link below...
```

### **Test 2: OTP Email (Waiter Flow)**

1. Open waiter dashboard
2. Select table
3. Choose "New Customer"
4. Enter customer email
5. Click "Send OTP"

**Expected:**
```
Subject: Your Verification Code - customer_verification
From: Restaurant Management <your-sender@email.com>
Body: Beautiful HTML email with OTP code displayed
```

### **Test 3: Check Supabase Logs**

1. Go to Supabase Dashboard
2. Navigate to: **Logs Explorer**
3. Filter by: `auth` component
4. Look for email sending events

---

## 📊 EMAIL TEMPLATES CUSTOMIZATION

After SMTP is configured, you can customize email templates:

### **In Supabase Dashboard:**

1. Go to: **Authentication** → **Email Templates**
2. Select template type:
   - Magic Link
   - Confirmation Signup
   - Reset Password
   - Email Change
3. Edit HTML content
4. Add your branding/logo
5. Save changes

### **Example Custom Template:**

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .header { background: #667eea; color: white; padding: 20px; }
    .content { padding: 30px; }
    .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🍽️ Restaurant Management</h1>
  </div>
  <div class="content">
    <h2>Welcome!</h2>
    <p>Please confirm your email address:</p>
    <a href="{{ .ConfirmationURL }}" class="button">Confirm Email</a>
  </div>
</body>
</html>
```

---

## ✅ VERIFICATION CHECKLIST

After configuring SMTP:

- [ ] SMTP settings saved in Supabase dashboard
- [ ] Test email sent successfully
- [ ] Signup verification email received
- [ ] OTP email received (waiter flow)
- [ ] Email sender name shows correctly
- [ ] Email doesn't go to spam
- [ ] Rate limits are acceptable
- [ ] Error logs show no failures

---

## 🚀 PRODUCTION RECOMMENDATIONS

### **For Production Deployment:**

**Use SendGrid Paid Plan** ($15/month):
- 40,000 emails/month
- Dedicated IP option
- Priority support
- Advanced analytics

**OR**

**Use Amazon SES** (Cheapest):
- $0.10 per 1,000 emails
- Highly reliable
- AWS integration
- More complex setup

### **Domain Authentication (Recommended):**

Configure SPF, DKIM, DMARC records for your domain to prevent emails from being marked as spam.

**DNS Records to Add:**

```
Type: TXT
Name: @
Value: v=spf1 include:sendgrid.net ~all

Type: CNAME
Name: em1234.yourdomain.com
Value: u1234.wl.sendgrid.net
```

SendGrid provides exact values in dashboard under **Sender Authentication** → **Authenticate Your Domain**

---

## 💡 QUICK START RECOMMENDATION

**For Testing/Development:**
Use Gmail SMTP (free, easy setup)

**For Production:**
Use SendGrid with custom domain (professional, reliable)

**For Minimum Cost:**
Use Amazon SES (cheapest, but more setup)

---

## 📞 SUPPORT RESOURCES

- **Supabase Email Docs:** https://supabase.com/docs/guides/auth/auth-smtp
- **SendGrid Docs:** https://docs.sendgrid.com/
- **Gmail App Passwords:** https://support.google.com/accounts/answer/185833

---

## 🎯 NEXT STEPS

1. **Choose your email provider** (Gmail or SendGrid recommended)
2. **Follow setup steps above**
3. **Test with real email addresses**
4. **Monitor delivery in Supabase logs**
5. **Customize email templates**
6. **Deploy to production**

---

**Need help?** Check the logs in Supabase Dashboard → Logs Explorer to see what's happening with email delivery.
