# Firebase Setup — Continuum AI

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Create Project** → name it `continuum-ai`
3. Disable Google Analytics (optional)
4. Click **Create Project**

---

## Step 2: Enable Authentication

1. Firebase Console → **Authentication** → **Get Started**
2. Enable **Email/Password** sign-in method
3. (Optional) Enable **Google** later
4. Click **Save**

---

## Step 3: Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create Database**
2. Select **Start in production mode**
3. Region: `us-central1`
4. Click **Enable**

---

## Step 4: Apply Security Rules

1. Firebase Console → **Firestore** → **Rules** tab
2. Paste the contents of `continuum-ai-mobile/firestore.rules`
3. Click **Publish**

---

## Step 5: Get Firebase Config

1. Firebase Console → ⚙️ **Project Settings**
2. Scroll to **Your apps** → click **Web icon** (`</>`)
3. App nickname: `continuum-ai-web`
4. Click **Register app**
5. Copy the `firebaseConfig` values

---

## Step 6: Set Environment Variables

Add these to `continuum-ai-mobile/.env`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=continuum-4129a.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=continuum-4129a
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=continuum-4129a.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=521613508911
EXPO_PUBLIC_FIREBASE_APP_ID=1:521613508911:web:...
```

The `.env` file is gitignored — never commit real API keys.

---

## Step 7: Verify

```bash
# Start the app
cd continuum-ai-mobile
npx expo start --web --port 8081 --clear

# Sign up with a real email
# Check Firebase Console → Authentication → Users
# New user should appear within seconds
```

---

## Architecture

| Layer | Technology |
|---|---|
| Auth | Firebase Authentication (Email/Password) |
| Database | Cloud Firestore |
| Persistence (native) | AsyncStorage via `getReactNativePersistence` |
| Persistence (web) | `browserLocalPersistence` (localStorage) |
| Demo mode | Bypasses Firebase entirely — uses mock data |

---

## Firestore Collections

| Collection | Document ID | Description |
|---|---|---|
| `users` | `{uid}` | Profile, name, email, referral code |
| `healthProfiles` | `{uid}` | Conditions, medications, allergies |
| `healthEntries` | auto | Uploaded documents / notes |
| `insights` | auto | AI-generated health insights |
| `conversations` | auto | Chat history |
