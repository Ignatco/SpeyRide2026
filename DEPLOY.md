# Deploy Spey Ride Backend — Step by Step

The mobile app (built on Expo) needs a **publicly accessible backend URL**.
Follow these steps — takes about 10 minutes.

---

## Step 1 — Free MongoDB (Atlas)

1. Go to https://cloud.mongodb.com
2. Sign up free → Create a free **M0** cluster (any region)
3. When asked, create a database user (save the username + password)
4. Click **Connect** → **Drivers** → copy the connection string
   - Looks like: `mongodb+srv://username:password@cluster.mongodb.net/`
5. Replace `<password>` with your actual password
6. Keep this — you'll need it in Step 2

---

## Step 2 — Deploy Backend (Railway — free tier)

1. Go to https://railway.app → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `Ignatco/SpeyRide2026`
4. Railway will auto-detect the backend — set **Root Directory** to `backend`
5. Go to **Variables** tab and add these:

| Variable | Value |
|---|---|
| `MONGO_URL` | Your Atlas connection string from Step 1 |
| `DB_NAME` | `speyride` |
| `JWT_SECRET` | Any long random string e.g. `speyride-jwt-2026-xK9mP3` |
| `CORS_ORIGINS` | `*` |
| `TWILIO_ACCOUNT_SID` | *(leave blank — OTP works in dev mode)* |
| `TWILIO_AUTH_TOKEN` | *(leave blank)* |
| `TWILIO_VERIFY_SERVICE_SID` | *(leave blank)* |
| `STRIPE_API_KEY` | *(leave blank for now)* |

6. Railway will deploy and give you a URL like `https://speyride-backend.up.railway.app`
7. Test it: open `https://YOUR_URL/api/` in your browser → should show `{"status":"ok"}`

---

## Step 3 — Update mobile app with backend URL

Edit `mobile/eas.json` — replace `YOUR_BACKEND_URL_HERE` with your Railway URL:

```json
"env": {
  "EXPO_PUBLIC_BACKEND_URL": "https://speyride-backend.up.railway.app"
}
```

Do this for all 3 profiles (development, preview, production).

Commit and push:
```bash
git add mobile/eas.json
git commit -m "fix: set production backend URL"
git push origin main
```

---

## Step 4 — Build on Expo (EAS)

1. Go to https://expo.dev → sign in
2. Go to your project → **Builds** → **New Build**
3. Select platform: **iOS** or **Android**
4. Select profile: **preview** (easiest for testing)
5. EAS builds the app with your backend URL baked in
6. Install on your device via the QR code / link EAS provides

---

## OTP in dev mode

Since Twilio is not configured, when you enter your phone number:
- The backend returns the code directly in the API response
- The app shows it as a **popup Alert** on screen
- No SMS is sent — just copy the code from the popup

To enable real SMS later, add your Twilio credentials to Railway variables.

---

## Alternative backend hosts (all free tier)

- **Render**: https://render.com — use the `render.yaml` already in the repo
- **Fly.io**: https://fly.io — `fly launch` from the backend folder
- **Heroku**: https://heroku.com — use the `Procfile` already in the repo
