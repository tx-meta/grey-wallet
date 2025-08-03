# Email Verification with Supabase

## Overview

Email verification in the Grey Wallet API is handled entirely by Supabase Auth. This approach provides a robust, secure, and maintainable solution without requiring custom implementation.

## 🔄 How It Works

### 1. **Sign-Up Flow**
```
User Signs Up → Supabase Creates User → Supabase Sends Verification Email → User Clicks Link → Supabase Verifies Email
```

### 2. **Verification Status Tracking**
- **Supabase**: Tracks `email_confirmed_at` timestamp
- **Local Database**: Syncs `isEmailVerified` boolean with Supabase status
- **Automatic Sync**: Status is synced on every sign-in

### 3. **Email Verification Process**
1. User registers with email/password
2. Supabase automatically sends verification email
3. User clicks verification link in email
4. Supabase validates token and updates `email_confirmed_at`
5. On next sign-in, local database syncs with Supabase status

## 🛠️ Implementation Details

### **Sign-Up Response**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "country": "United States",
      "currency": "USD",
      "phone": "+1234567890",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "addresses": [...],
    "requiresEmailConfirmation": true,
    "message": "User registered successfully. Please check your email to confirm your account."
  }
}
```

### **Sign-In Response**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "country": "United States",
      "currency": "USD",
      "phone": "+1234567890",
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": 1704067200
    }
  }
}
```

## 🔧 Configuration

### **Supabase Dashboard Setup**

1. **Email Templates**
   - Go to Authentication → Email Templates
   - Customize confirmation email template
   - Set redirect URL to your frontend

2. **Email Provider**
   - Configure SendGrid, SMTP, or other provider
   - Set up domain verification
   - Test email delivery

3. **Site URL**
   - Set your site URL in Authentication → URL Configuration
   - Configure redirect URLs for verification

### **Environment Variables**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 📧 Email Verification Flow

### **Step 1: User Registration**
```typescript
// User signs up
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "country": "United States",
  "currency": "USD"
}

// Response indicates email confirmation required
{
  "requiresEmailConfirmation": true,
  "message": "User registered successfully. Please check your email to confirm your account."
}
```

### **Step 2: Supabase Sends Email**
- Supabase automatically sends verification email
- Email contains secure verification link
- Link includes encrypted token for security

### **Step 3: User Verifies Email**
- User clicks link in email
- Supabase validates token
- Updates `email_confirmed_at` timestamp
- Redirects to your application

### **Step 4: Status Sync on Sign-In**
```typescript
// On next sign-in, status is synced
const supabaseEmailVerified = !!supabaseUser.email_confirmed_at;
if (localUser.isEmailVerified !== supabaseEmailVerified) {
  localUser.verifyEmail();
  await this.userRepository.update(localUser);
}
```

## 🚫 What We Don't Implement

### **Custom Email Verification Endpoints**
- ❌ `POST /api/auth/verify-email` - Not needed
- ❌ `POST /api/auth/resend-verification` - Use Supabase's resend
- ❌ Custom token generation - Supabase handles this
- ❌ Custom email templates - Use Supabase templates

### **Custom Email Sending**
- ❌ `sendEmailVerification()` - Removed from NotificationService
- ❌ Custom verification tokens - Supabase generates these
- ❌ Custom email templates - Use Supabase's built-in templates

## ✅ What Supabase Handles

### **Automatic Features**
- ✅ Email verification email sending
- ✅ Secure token generation and validation
- ✅ Email confirmation tracking (`email_confirmed_at`)
- ✅ Verification link handling
- ✅ Email template customization
- ✅ Resend verification functionality
- ✅ Rate limiting and security

### **Configuration Options**
- ✅ Custom email templates
- ✅ Multiple email providers
- ✅ Domain verification
- ✅ Redirect URL configuration
- ✅ Email delivery tracking

## 🔍 Status Checking

### **In Sign-In Response**
```typescript
// Email verification status is included in sign-in response
{
  "isEmailVerified": true, // Based on Supabase's email_confirmed_at
  "isPhoneVerified": false // Local phone verification status
}
```

### **In User Profile**
```typescript
// Get current user includes verification status
GET /api/auth/me
Authorization: Bearer <token>

// Response includes verification status
{
  "user": {
    "isEmailVerified": true,
    "isPhoneVerified": false
  }
}
```

## 🛡️ Security Benefits

### **Supabase Security Features**
- ✅ Secure token generation
- ✅ Token expiration handling
- ✅ Rate limiting protection
- ✅ Email delivery verification
- ✅ Domain verification
- ✅ Automatic cleanup of expired tokens

### **No Custom Security Code**
- ✅ No custom token generation
- ✅ No custom email sending
- ✅ No custom verification logic
- ✅ No custom security vulnerabilities

## 📋 Testing

### **Manual Testing**
1. Register new user
2. Check email for verification link
3. Click verification link
4. Sign in and verify status is updated

### **Automated Testing**
```typescript
// Test sign-up with email confirmation required
const signUpResponse = await signUp(userData);
expect(signUpResponse.data.requiresEmailConfirmation).toBe(true);

// Test sign-in after verification
const signInResponse = await signIn(credentials);
expect(signInResponse.data.user.isEmailVerified).toBe(true);
```

## 🎯 Best Practices

### **Frontend Integration**
1. **Show verification status**: Display verification status in user profile
2. **Handle unverified users**: Prevent access to sensitive features
3. **Resend functionality**: Use Supabase's resend feature
4. **Clear messaging**: Inform users about verification requirements

### **Backend Integration**
1. **Status sync**: Always sync with Supabase on sign-in
2. **No custom endpoints**: Don't implement custom verification
3. **Use Supabase status**: Always use `email_confirmed_at` as source of truth
4. **Logging**: Log verification status changes for debugging

## 🔄 Migration Notes

### **From Custom Implementation**
- ✅ Removed custom email verification endpoints
- ✅ Removed custom token management
- ✅ Removed custom email sending
- ✅ Updated to use Supabase status
- ✅ Maintained local database consistency

### **Benefits Achieved**
- ✅ Reduced code complexity
- ✅ Improved security
- ✅ Better maintainability
- ✅ Automatic updates and features
- ✅ Professional email delivery 