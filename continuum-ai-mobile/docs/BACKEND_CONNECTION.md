# Connecting Mobile App to Continuum AI Backend

## Prerequisites
- Backend repo running on a server with a domain + SSL certificate
- CORS configured for your Expo bundle ID and scheme
- PostgreSQL database running

## API Base URL by Environment
| Environment | URL |
|---|---|
| Development | `http://localhost:8000` |
| Staging | `https://api-staging.continuum-health.app` |
| Production | `https://api.continuum-health.app` |

Set via `.env`, `.env.staging`, `.env.production` — loaded by EAS build profiles.

---

## Required Backend Changes

### 1. CORS (backend/main.py)
```python
origins = [
    "http://localhost:8000",
    "https://api.continuum-health.app",
    "exp://",         # Expo Go
    "continuum://",   # production deep link scheme
]
```

### 2. Push Notification Token Endpoint (new)
```
POST /users/push-token
Body: { "token": string, "platform": "ios" | "android" }
```
Saves token to users table. Use Expo Push API for server-side notifications:
```
POST https://exp.host/--/api/v2/push/send
Body: { "to": token, "title": "...", "body": "..." }
```
Add to users table: `push_token VARCHAR`, `push_platform VARCHAR`

### 3. Health Profile Endpoint
Verify `PUT /health/profile` accepts:
```json
{
  "conditions": ["string"],
  "medications": [{ "name": "string", "dosage": "string", "frequency": "string" }],
  "allergies": ["string"],
  "dateOfBirth": "string",
  "biologicalSex": "male | female | other"
}
```

### 4. File Upload Endpoint
Verify `POST /health/entries` accepts `multipart/form-data`:
- `file`: binary (PDF or image)
- `entry_type`: string

### 5. Production Environment Variables (backend .env)
```
ANTHROPIC_API_KEY=your_key
DATABASE_URL=postgresql://...
JWT_SECRET=minimum_32_char_random_string
SENDGRID_API_KEY=your_key
CORS_ORIGINS=https://api.continuum-health.app
EXPO_PUSH_URL=https://exp.host/--/api/v2/push/send
```

---

## Testing the Connection
```bash
# Point the app at your production API
EXPO_PUBLIC_API_URL=https://api.continuum-health.app npx expo start

# Test: log in → upload a file → verify it appears in backend DB
psql $DATABASE_URL -c "SELECT * FROM health_entries ORDER BY created_at DESC LIMIT 5;"
```
