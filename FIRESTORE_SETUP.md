# Firestore Setup Guide

## Overview
User profiles and onboarding status are now persisted to Firebase Firestore. This means users only need to complete onboarding once, and their settings will be saved across:
- App reinstalls
- Different devices
- Storage clears

## What's Saved to Firestore

When a user completes onboarding, the following data is saved to Firestore under `/users/{uid}`:

```json
{
  "uid": "user_firebase_uid",
  "name": "Pilot Name",
  "email": "pilot@example.com",
  "homeAirport": "KJFK",
  "experienceLevel": "private",
  "defaultAircraft": "c172s",
  "onboardingComplete": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Deploy Firestore Security Rules

To enable user profile persistence, you need to deploy the security rules to your Firebase project:

### Option 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` from this project
5. Paste into the Firebase console
6. Click **Publish**

### Option 2: Firebase CLI

1. Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in this project (if not already done):
   ```bash
   firebase init firestore
   # Select your project
   # Keep the default firestore.rules file
   ```

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Security Rules Explanation

The rules in `firestore.rules` ensure:

- **User Profiles**: Users can only read/write their own profile
  - Path: `/users/{userId}`
  - Condition: `request.auth.uid == userId`

- **Fuel Prices**: Public read, authenticated write
  - Path: `/fuel_prices/{document}`
  - Read: Anyone (needed for price display)
  - Write: Authenticated users only

## Testing

After deploying the rules:

1. **Clear app data** (to start fresh):
   - iOS: Delete and reinstall the app
   - Android: Settings → Apps → SkyBrief → Clear Data

2. **Sign up with a new account** or sign in with an existing account

3. **Complete onboarding** (profile, aircraft, minimums, permissions)

4. **Sign out** from the app

5. **Sign back in** with the same credentials
   - ✅ You should NOT see onboarding again
   - ✅ Your home airport and settings should be preserved
   - ✅ Console should show: `[Auth] Found existing profile with completed onboarding`

## Troubleshooting

### "No existing profile found" after completing onboarding

**Cause**: Firestore security rules not deployed or incorrect

**Fix**:
1. Check Firebase Console → Firestore → Rules
2. Verify rules match `firestore.rules`
3. Check Firebase Console → Firestore → Data
4. Look for `users/{your-uid}` document - should exist after onboarding

### "Permission denied" errors in console

**Cause**: Security rules rejecting the request

**Fix**:
1. Verify you're signed in (check `request.auth != null`)
2. For user profiles, verify `request.auth.uid == userId`
3. Check Firebase Console → Firestore → Rules for syntax errors

### User forced to onboard every time (old issue)

**Cause**: Development flag `FORCE_RESET_ON_LAUNCH` was set to `true`

**Fix**: This has been disabled in `index.ts`. If you need to reset for testing:
1. Change `FORCE_RESET_ON_LAUNCH = true` in `index.ts`
2. Launch app once
3. Change back to `false`

## Data Migration

Existing users who completed onboarding before Firestore persistence was added:

- Their onboarding status was stored **locally only** (MMKV storage)
- When they sign in again, the app will:
  1. Try to load from Firestore (will be empty)
  2. Fall back to local storage check
  3. If locally completed, let them through
  4. Their profile will be saved to Firestore on next onboarding completion

To force migration of existing users:
- They would need to go through onboarding one more time
- OR manually create their Firestore document via Firebase Console

## Future Enhancements

Consider adding:
- Sync minimums settings to Firestore
- Sync weight & balance profiles to Firestore
- Sync flight risk assessment preferences
- Cross-device sync for favorites/recent airports
