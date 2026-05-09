# Spey Ride — Mobile App (Expo / React Native)

Native iOS app for **Spey Ride**, a local taxi service for Aviemore, Cairngorms and the Highlands.

## Stack
- Expo SDK 52 + Expo Router (file-based routing)
- React Native 0.76, React 18.3
- `react-native-maps` with native Apple Maps on iOS
- `expo-secure-store` for JWT storage
- `expo-web-browser` for Stripe Checkout
- Backend: existing FastAPI at `EXPO_PUBLIC_BACKEND_URL` (no changes needed)

## Bundle ID
- iOS: `taxi.speyride`
- Android: `taxi.speyride`

## Run on your iPhone — no Mac required

1. **Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) on your iPhone** from the App Store.
2. On your dev machine (Mac, Windows, Linux):
   ```bash
   cd /app/mobile
   yarn install        # already done in this container
   npx expo start
   ```
3. A QR code appears in the terminal. **Scan it with the iPhone Camera app** (or the Expo Go app) and the build streams to your phone in seconds.
4. The app will auto-hit the backend at `EXPO_PUBLIC_BACKEND_URL` (already set in `.env`).

## Run in iOS Simulator (Mac only)
```bash
npx expo start --ios
```

## Build a real `.ipa` for TestFlight / App Store
You'll need:
- Apple Developer Program account ($99/yr)
- EAS account (free): `npm install -g eas-cli && eas login`

Then:
```bash
eas build --platform ios
eas submit --platform ios
```
EAS handles signing, provisioning, and uploads to App Store Connect — no Xcode required.

## Project layout
```
mobile/
├── app/                    # expo-router routes
│   ├── _layout.jsx         # root: AuthProvider, Stack
│   ├── index.jsx           # landing
│   ├── login.jsx           # OTP login
│   ├── onboarding.jsx      # role + profile
│   ├── rider/
│   │   ├── index.jsx       # home with map + bottom sheet
│   │   ├── ride/[id].jsx   # status, payment, rating
│   │   └── history.jsx
│   └── driver/
│       ├── index.jsx       # online toggle + requests
│       ├── ride/[id].jsx   # active ride flow
│       └── earnings.jsx
├── components/             # Map, Button, Input
├── context/                # AuthContext
├── lib/                    # api, theme
├── app.json                # Expo config (bundle ID, permissions)
├── babel.config.js
├── package.json
└── .env                    # EXPO_PUBLIC_BACKEND_URL
```

## Environment
`.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://ride-ready-13.preview.emergentagent.com
```

## Notes
- Stripe checkout opens in the in-app browser; the app polls `/api/payments/status/:session_id` after the user returns.
- OTP via Twilio Verify (real SMS for verified numbers, dev fallback otherwise).
- Maps default to Aviemore (57.1959, -3.829). Live location requested via `expo-location`.
