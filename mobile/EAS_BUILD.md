# Spey Ride — iOS Build via EAS (no Mac required)

A turnkey checklist to get a real iOS build of **Spey Ride** onto your iPhone using Expo's cloud build service. Total time first run: **~25 minutes** (most of it waiting on the cloud build).

## Prerequisites

1. **Free Expo account** — sign up at https://expo.dev
2. **Node.js** on your machine (any OS — Windows, Mac, Linux)
3. **Apple ID** with two-factor auth — needed for provisioning. Free Apple ID is fine for **development builds** (installs on your devices for 7-day rotating profiles). $99/yr Apple Developer Program is required only for TestFlight + App Store.

> The `eas build` server runs in Apple's cloud / Expo's cloud — it signs the binary remotely so you never need a Mac or Xcode.

## One-time setup (5 min)

On your computer:

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Get the project (clone repo or copy /app/mobile to your machine)
cd /path/to/mobile

# 3. Install JS deps (if not already)
yarn install

# 4. Log in to Expo
eas login
# → enter your Expo username + password

# 5. Link this project to your Expo account
eas init
# → confirms project ID, writes it back to app.json
```

## Build the iOS development client (~15 min cloud time)

```bash
eas build --profile development --platform ios
```

What happens:
1. EAS asks for your Apple ID (and 2FA code) the first time. **All credentials stay on Apple's servers — Expo doesn't keep your password.**
2. EAS auto-creates the App ID, provisioning profile, and certificate for `taxi.speyride` under your Apple Developer team.
3. EAS asks which devices to register. Open https://expo.dev/accounts/[your-account]/projects/spey-ride/devices and tap "Register a new device" → email yourself the link → open on iPhone → install profile. (Or follow the EAS CLI prompts.)
4. The cloud build kicks off. You can close the terminal — it'll email you when ready.
5. You get a **QR code + install URL**. Open the URL on your iPhone Safari → tap "Install" → trust the developer profile in **Settings → General → VPN & Device Management**.

## Run the dev server, connect your iOS app

Once the dev client is installed:
```bash
npx expo start --dev-client
```
Open the **Spey Ride** app on your iPhone (not Expo Go). Scan the QR. The JS bundle streams from your computer. You can edit code and hot-reload as usual — but this time **background location works** because it's a real native binary with the right entitlements.

## Production build for TestFlight / App Store

When you're ready to ship:

```bash
# Build a production .ipa
eas build --profile production --platform ios

# Submit to App Store Connect
eas submit --profile production --platform ios
```
Requires a paid Apple Developer Program membership ($99/yr).

## Troubleshooting

| Issue | Fix |
|---|---|
| `eas: command not found` | `npm install -g eas-cli` |
| Apple ID 2FA prompts forever | Use an app-specific password from https://appleid.apple.com (Sign-In and Security → App-Specific Passwords) |
| "Provisioning profile doesn't include device" | Add the device UDID in Expo dashboard → Devices, then re-run `eas build` |
| Stuck in build queue | Free tier has limited concurrent builds. Wait or pay for priority. |
| Background location not working in Expo Go | Expected. Background tasks require the dev or production build; Expo Go's binary can't extend its own background-mode list. |

## Project IDs (filled in after `eas init`)
After running `eas init` once, this file (`app.json`) gains an `extra.eas.projectId` field. Keep it committed.
