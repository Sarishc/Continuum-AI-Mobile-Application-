# Deployment Commands

## Prerequisites
1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login` (requires Expo account at expo.dev)
3. Initialize project: `eas init` (run once — sets EAS project ID in app.json)
4. Update `eas.json` submit section with your Apple/Google credentials

---

## Development Build (real device testing with dev tools)
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```
Install via QR code on real device. Supports fast refresh.

## Preview Build (internal TestFlight / Play Store internal track)
```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```
Distribute to testers via TestFlight or Play Console internal testing.

## Production Build
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```
Creates `.ipa` (iOS App Store) and `.aab` (Android App Bundle).

---

## Submit to App Stores
After production build completes:
```bash
eas submit --platform ios      # submits to App Store Connect
eas submit --platform android  # submits to Google Play
```

## OTA Update (no rebuild — JS changes only)
```bash
eas update --branch production --message "Fix: [description]"
```
Users receive update silently in background. No App Store review required.

## Check Build Status
```bash
eas build:list
```

---

## First-Time iOS Setup
1. Enrol in Apple Developer Program: developer.apple.com ($99/yr)
2. Create App ID in App Store Connect with bundle ID `com.continuumhealth.app`
3. Add credentials to `eas.json` submit section:
   - `appleId`: your Apple ID email
   - `ascAppId`: App Store Connect app numeric ID
   - `appleTeamId`: your 10-char team ID (from developer.apple.com/account)
4. EAS handles certificates and provisioning profiles automatically

## First-Time Android Setup
1. Create Google Play Console account: play.google.com/console ($25 one-time)
2. Create new app with package `com.continuumhealth.app`
3. Generate service account key (Play Console → Setup → API access)
4. Save as `google-services-key.json` in project root (gitignored)

---

## Build Times
| Profile | Platform | Approx. Time |
|---|---|---|
| development | iOS | 10–15 min |
| preview | iOS | 12–18 min |
| production | iOS | 15–20 min |
| Any | Android | 8–12 min |

EAS free tier: 30 builds/month. Upgrade at expo.dev for unlimited.

---

## TestFlight Submission Checklist
- [ ] Production build completed successfully (`eas build:list`)
- [ ] App icon 1024×1024 exists at `assets/icon.png`
- [ ] Splash screen configured in `app.json`
- [ ] All privacy permissions have descriptions in `infoPlist`
- [ ] `eas submit --platform ios` submitted to App Store Connect
- [ ] In App Store Connect: fill in App Information, Pricing, Privacy details
- [ ] Add build to TestFlight group and invite testers
- [ ] Testers install TestFlight app → accept invite → install build
