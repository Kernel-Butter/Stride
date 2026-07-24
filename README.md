# Stride

Phase 1 React Native/Expo implementation of the anti-procrastination app described in
the planning documents one directory above.

## Run

```powershell
npm install
npm start
```

Scan the QR code with Expo Go for the current JS/SQLite slice. Native reminder work
will move the app to an Expo development build later in Phase 1.

## Included so far

- Expo + TypeScript project foundation
- SQLite migration and local mission/objective repository
- Zustand mission store
- Seed mission, Today screen, mission detail, objective completion, and mission creation
- Light/dark tokens based on `prototype_universal.html`
- Pure mission heat engine with unit tests

## Commands

```powershell
npm run typecheck
npm test
```
