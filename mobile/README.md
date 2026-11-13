# SkillConnect-HUB mobile app

This is the Expo/React Native client for SkillConnect-HUB. It uses the existing Express API and PostgreSQL-backed account, marketplace, messaging, and order flows.

## Local development

```bash
npm install
cp .env.example .env
npm start
```

For a physical phone, `EXPO_PUBLIC_API_URL` must point to an address the phone can reach. Use the computer's LAN address during local development, for example `http://192.168.1.20:5000/api`, or use the deployed Render API URL.

## Android APK

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli env:set --name EXPO_PUBLIC_API_URL --value https://YOUR-RENDER-SERVICE.onrender.com/api --environment preview --visibility plaintext
npm run build:apk
```

The `preview` profile in `eas.json` produces an installable APK. EAS prints a build page and download URL when the build completes. The production profile produces the Android App Bundle intended for Google Play.

`EXPO_PUBLIC_API_URL` is not a secret; it is embedded in the app and can be visible to users. Keep Paystack secret keys, database credentials, Cloudinary secrets, and encryption keys on Render only. For local phone testing, put `EXPO_PUBLIC_API_URL=http://YOUR-LAN-IP:5000/api` in `mobile/.env` instead. Expo loads `EXPO_PUBLIC_` variables from `.env` during local development and from EAS environments during cloud builds.

Before the first cloud build, replace any generated EAS project metadata if the app is connected to a different Expo project. Do not commit Expo tokens or credentials.
