# Spey Ride — How to Run

## Prerequisites
- Python 3.11+
- Node.js 18+ and yarn (`npm install -g yarn`)
- MongoDB — either:
  - **Local**: Install from https://www.mongodb.com/try/download/community
  - **Free cloud**: Create a free cluster at https://cloud.mongodb.com → copy connection string → paste into `backend/.env` as `MONGO_URL`

---

## 1. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Edit .env if needed (MongoDB URL, Stripe keys, etc.)
# The app ships with a working .env — OTP works in dev mode out of the box

# Start server
uvicorn server:app --reload --port 8001
```

Visit **http://localhost:8001/docs** to see all API endpoints.

**OTP in dev mode**: when Twilio is not configured (blank in .env), the app returns the code directly in the API response — the browser shows it as a toast notification. No SMS is sent.

---

## 2. Frontend (web)

```bash
cd frontend

# Install dependencies
yarn install

# Start
yarn start
```

Opens at **http://localhost:3000**

---

## 3. Mobile (iPhone/Android)

```bash
cd mobile

# Install dependencies
yarn install

# Find your machine's local IP first:
# Mac: ifconfig | grep "inet " | grep -v 127
# Windows: ipconfig | findstr "IPv4"

# Edit mobile/.env — replace localhost with your IP:
# EXPO_PUBLIC_BACKEND_URL=http://192.168.1.X:8001

# Start Expo
npx expo start
```

Install **Expo Go** from the App Store / Google Play, scan the QR code.  
Both phone and computer must be on the **same Wi-Fi network**.

---

## Environment variables

### `backend/.env`
| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | Database name (e.g. `speyride`) |
| `JWT_SECRET` | ✅ | Any long random string |
| `TWILIO_ACCOUNT_SID` | ❌ | Leave blank for dev OTP mode |
| `TWILIO_AUTH_TOKEN` | ❌ | Leave blank for dev OTP mode |
| `TWILIO_VERIFY_SERVICE_SID` | ❌ | Leave blank for dev OTP mode |
| `STRIPE_API_KEY` | ❌ | Get from dashboard.stripe.com/test/apikeys |
| `STRIPE_WEBHOOK_SECRET` | ❌ | Only needed for webhook verification |

### `frontend/.env`
| Variable | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | `http://localhost:8001` (or your server URL) |

### `mobile/.env`
| Variable | Value |
|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | `http://YOUR_LOCAL_IP:8001` |

---

## Quickstart (all three at once)

```bash
# Terminal 1 — Backend
cd backend && uvicorn server:app --reload --port 8001

# Terminal 2 — Frontend
cd frontend && yarn start

# Terminal 3 — Mobile (optional)
cd mobile && npx expo start
```
