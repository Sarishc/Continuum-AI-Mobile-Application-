# Continuum AI — Backend E2E Test

Run these 6 curl commands against your deployed backend before every EAS build.
All 6 must return HTTP 200 with expected JSON shape.

Set your backend URL first:

```bash
export API="https://your-railway-app.up.railway.app"
```

---

## Test 1 — Health check

```bash
curl -s "$API/health" | python3 -m json.tool
```

**Expected:**
```json
{ "status": "ok", "db": "connected" }
```

---

## Test 2 — Signup

```bash
curl -s -X POST "$API/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@continuum.local","password":"Test1234!"}' \
  | python3 -m json.tool
```

**Expected:** `{ "tokens": { "accessToken": "...", "refreshToken": "..." }, "user": { "id": ... } }`

Save the token:
```bash
export TOKEN="<accessToken from above>"
```

---

## Test 3 — Auth me

```bash
curl -s "$API/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

**Expected:** `{ "id": ..., "email": "test@continuum.local", "name": "Test User" }`

---

## Test 4 — Upload health entry

```bash
curl -s -X POST "$API/health/entries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Lab Result","type":"lab","content":"Glucose: 95 mg/dL, HbA1c: 5.4%"}' \
  | python3 -m json.tool
```

**Expected:** `{ "id": ..., "title": "Test Lab Result", "insights": [...] }`

---

## Test 5 — AI ask

```bash
curl -s -X POST "$API/health/ask" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"What does my HbA1c of 5.4% mean?","mode":"ai"}' \
  | python3 -m json.tool
```

**Expected:** `{ "answer": "...", "confidence": "high", "reasoning": "..." }`

---

## Test 6 — Referral code

```bash
curl -s "$API/referrals/my-code" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

**Expected:** `{ "code": "TESTU-XXXX", "referralUrl": "https://continuum-health.app/invite/...", "totalReferrals": 0 }`

---

## Cleanup

```bash
# Delete the test account (optional)
curl -s -X DELETE "$API/auth/account" \
  -H "Authorization: Bearer $TOKEN"
```

---

## All 6 pass?

```
✅ Test 1 — Health check
✅ Test 2 — Signup
✅ Test 3 — Auth me
✅ Test 4 — Upload entry
✅ Test 5 — AI ask
✅ Test 6 — Referral code
→ READY to run: eas build --profile production --platform ios
```

If any test fails, check Railway logs:
```bash
railway logs --tail
```
