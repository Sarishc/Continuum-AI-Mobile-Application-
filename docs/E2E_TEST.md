# End-to-End Test Plan — Continuum AI Mobile

This document covers manual E2E testing for the Continuum AI mobile app against
a live FastAPI backend. Run through each section before every TestFlight / Play
Store internal build.

---

## Prerequisites

| Item | Detail |
|------|--------|
| Backend | Running at `http://localhost:8000` (dev) or staging URL |
| Device | Physical device or Expo Go on iOS/Android simulator |
| Env | `.env.development` with correct `EXPO_PUBLIC_API_URL` |
| Test user | Pre-created account in the database |

---

## 1. Auth Flow

### 1.1 Sign Up
1. Open app → land on **Login** screen.
2. Tap **Create account**.
3. Enter name, email, new password → tap **Sign Up**.
4. **Expected**: redirected to Onboarding Step 1.

### 1.2 Login
1. Enter credentials of existing account → tap **Sign In**.
2. **Expected**: redirected to `/(tabs)` (Dashboard or Timeline).
3. Kill and reopen app.
4. **Expected**: stays logged in (token persisted in SecureStore).

### 1.3 Token Refresh
1. In backend, reduce `ACCESS_TOKEN_EXPIRE_MINUTES` to `1` temporarily.
2. Log in, wait 90 seconds.
3. Navigate to Timeline (triggers an authenticated API call).
4. **Expected**: call succeeds transparently — no logout, no error toast.

### 1.4 Logout
1. Profile tab → scroll to Account → tap **Sign Out** → confirm.
2. **Expected**: back at Login screen, SecureStore tokens cleared.

---

## 2. Onboarding

### 2.1 First-run Onboarding
1. Create new account → complete Steps 1 & 2 (swipe / tap Next).
2. On Step 3: enter age, select sex, pick 1+ conditions, enter a medication.
3. Tap **Get Started**.
4. **Expected**:
   - Profile saved to backend (`PATCH /health/profile`).
   - `onboarding_complete` stored in SecureStore.
   - Navigated to `/(tabs)`.
5. Kill and reopen app.
6. **Expected**: goes directly to `/(tabs)` — onboarding not shown again.

### 2.2 Skip Onboarding
1. Create new account.
2. Tap **Skip** on Step 1.
3. **Expected**: goes directly to `/(tabs)`, profile has defaults.

---

## 3. Health Timeline

### 3.1 Load & Scroll
1. Navigate to **Timeline** tab.
2. **Expected**: grouped entries (Today / Yesterday / weekday) rendered.
3. Scroll to bottom — pull-to-refresh.
4. **Expected**: spinner appears, data reloads.

### 3.2 Filter by Type
1. Tap a filter chip (e.g. **Lab Results**).
2. **Expected**: only lab_result entries shown.
3. Tap **All** to reset.

### 3.3 Expand Entry
1. Tap any entry card.
2. **Expected**: card expands to show description and structured data panel
   (if entry has structuredData).

---

## 4. Add Health Data (UploadModal)

### 4.1 Document Upload
1. Tap **+** FAB on any tab.
2. Tap **Upload Document**.
3. Pick a PDF from Files.
4. **Expected**:
   - `POST /health/entries` (multipart/form-data) called with file.
   - Success state shown ("Data Added").
   - Timeline refreshed (query invalidation).
   - Toast: "Data added — analysing…"

### 4.2 Add a Note
1. Tap **+** → **Add a Note**.
2. Type text → **Save Note**.
3. **Expected**: note appears in Timeline under Today.

### 4.3 Describe Symptoms
1. Tap **+** → **Describe Symptoms**.
2. **Expected**: modal closes and Chat tab opens (or chat pre-fill appears).

### 4.4 Offline Upload
1. Enable Airplane Mode.
2. Attempt document upload.
3. **Expected**:
   - Network banner appears at top.
   - Entry added to local store (offline fallback).
   - Success state shown.
4. Disable Airplane Mode.
5. **Expected**: network banner disappears.

---

## 5. Insights

### 5.1 Load Insights
1. Navigate to **Insights** tab.
2. **Expected**: summary banner (colour = worst severity), bar chart, insight cards.

### 5.2 Filter
1. Tap **Critical** chip → only critical insights shown.
2. Tap a health category chip (e.g. Metabolic) → filter combines.

### 5.3 Expand & Auto-Read
1. Expand a card with `is_read: false`.
2. Wait 2 seconds.
3. **Expected**: unread count in tab badge decrements by 1.

### 5.4 Specialist Sheet
1. Expand an insight with a specialist recommendation.
2. Tap **View Specialist Recommendations**.
3. **Expected**: bottom sheet slides up with specialist details.

---

## 6. Profile

### 6.1 View Profile
1. Navigate to **Profile** tab.
2. **Expected**: avatar with initials, health stats (entries, insights, streak).

### 6.2 Edit Profile
1. Tap **Edit Profile**.
2. Change name or add a condition chip.
3. Tap **Save**.
4. **Expected**: `PATCH /health/profile` called, profile header updates.

### 6.3 Notification Toggles
1. Toggle **Health Insights** off.
2. **Expected**: haptic feedback, switch state persists after tab switch.

---

## 7. Push Notifications

### 7.1 Token Registration
1. Grant notification permission on first launch.
2. Check backend DB: `users` table → `push_token` column populated.
3. **Expected**: Expo push token stored for authenticated user.

### 7.2 Receive Notification (Dev)
1. From backend, trigger a push to the registered token.
2. With app in background, receive notification.
3. Tap notification.
4. **Expected**: app opens and navigates to the `screen` in notification `data`.

---

## 8. Deep Links

| URL | Expected destination |
|-----|---------------------|
| `continuum:///(tabs)/timeline` | Timeline tab |
| `continuum:///(tabs)/insights` | Insights tab |
| `continuum:///onboarding` | Onboarding (if not complete) |

---

## 9. Error Scenarios

### 9.1 Error Boundary
1. Trigger a JavaScript error in a screen (temporarily throw in render).
2. **Expected**: ErrorBoundary catches it, shows "Something went wrong" with Try Again button.

### 9.2 API 500
1. Cause the backend to return 500 on `/health/timeline`.
2. **Expected**: Timeline shows empty state, toast shown (if implemented), no crash.

### 9.3 Invalid Credentials
1. Enter wrong password on Login.
2. **Expected**: error message displayed, no crash.

---

## 10. Performance Checks

- [ ] App cold-start to interactive < 3 seconds on mid-range Android.
- [ ] No janky animation on onboarding swipe / insight card expand.
- [ ] Timeline with 100+ entries scrolls at 60 fps.
- [ ] Network banner appears within 1 second of going offline.

---

## Sign-off Checklist

- [ ] All auth flows pass (1.1–1.4)
- [ ] Onboarding completes and persists (2.1–2.2)
- [ ] Timeline loads, filters, and expands (3.1–3.3)
- [ ] Document upload sends multipart to backend (4.1)
- [ ] Offline fallback stores entry locally (4.4)
- [ ] Insights load and filter correctly (5.1–5.4)
- [ ] Profile edits persist to backend (6.1–6.2)
- [ ] Push token saved to DB (7.1)
- [ ] Push notification deep-links correctly (7.2)
- [ ] No crashes on error scenarios (9.1–9.3)
