# Stride

Phase 1 React Native/Expo implementation of the anti-procrastination app described in
the planning documents one directory above.

## Run

```powershell
npm install
npx expo start --dev-client
```

The app now uses Notifee native notification code and therefore requires an Expo
development build; it no longer runs in Expo Go.

Create and install the Android development APK:

```powershell
npx eas-cli login
npx eas-cli build --profile development --platform android
npx expo start --dev-client
```

## Included so far

- Expo + TypeScript project foundation
- SQLite migration and local mission/objective repository
- Zustand mission store
- Seed mission, Today screen, mission detail, mission CRUD, objective rewards, and completion
- Light/dark tokens based on `prototype_universal.html`
- Pure mission heat engine with unit tests
- Permission-aware warm/hot mission reminders with quiet hours (23:00–07:00)
- Critical exact/full-screen Android alarms with three 30-minute snoozes per mission per day
- Required postpone reasons, saved reason history, deadline rescheduling, and do-it-now routing

After any native permission or notification change, create and install a new development
APK. An older development APK cannot receive the new alarm behavior.

## Commands

```powershell
npm run typecheck
npm test
```
