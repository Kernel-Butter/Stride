# Stride — Execution Checklist

Working plan for finishing the app, in order. One item lands (spec'd, built, typechecked,
tested, reviewed, on-device verified, committed) before the next starts. Update checkboxes
as we go.

## Done

- [x] **Wire up the deadline picker**
  Preset pills + "Custom" pill opens `@react-native-community/datetimepicker`
  (Android: date step then time step; iOS: single datetime widget). Also fixed
  edit-mode silently snapping an existing deadline to the nearest preset —
  it now shows and edits the real stored deadline.

- [x] **Focus timer (hold-to-end)**
  `focus_sessions` table, 15/25/50 min presets, 900ms hold-to-end gesture,
  keep-awake while running, launched from mission detail. Built by Codex
  from spec, reviewed and independently verified (typecheck + tests) before
  commit.

- [x] **Settings screen — Phase 2 closed out**
  Quiet hours are now user-editable (were hardcoded 23:00–07:00) and take effect
  immediately. Notification + exact-alarm permission status with one-tap fixes.
  Theme choice moved out of the Today header, persists across launches now
  (previously reset to system default every launch). Settings stored in SQLite,
  not MMKV — see commit message for why.

## Now

Needs a native rebuild before either of the last two features will run on
device (`expo-keep-awake` from the focus timer is a new native dep) —
`npx expo prebuild --clean` then `npx expo run:android` next time you're
testing. **Per the standing rule below: run Phase 2 on the real phone for a
stretch before Phase 3 (wins/streaks) starts.**

## Phase 3 — Loop

- [ ] **Wins + streaks**
  `wins` + `streaks` tables, winner loop, streak freeze, win history w/ monthly chart.
- [ ] **Chores (recurrence)**
  `chores` + `chore_logs` tables, recurrence rules, Today-screen section, check-off.

## Phase 4 — Depth

- [ ] **Roadmaps**
  `roadmaps` + `milestones` tables, missions gain optional `roadmap_milestone_id`,
  milestone locking/unlocking.
- [ ] **XP / levels**
  Fed by wins, streaks, roadmap milestones.
- [ ] **AI integration (Groq)**
  Three call sites only: suggest objectives+rewards, postpone one-line response,
  mission/weekly summaries. 5s timeout, silent offline degradation, no UI dependency
  on success.
- [ ] **Quick-capture widget**

## Phase 5 — Release

- [ ] Onboarding (permission explanations, battery exemption flow)
- [ ] Empty states pass
- [ ] Reduce-motion support
- [ ] Play Console listing
- [ ] Closed testing track (10–20 real users)

## Standing rules

- Data model / migration → pure domain logic (unit tested) → store wiring → UI →
  integration → tests → your on-device check → commit. In that order, every time.
- No phase 3+ work starts until Phase 2 has run on the real phone for a stretch —
  per the original dev doc's own gate.
- Every AI call site: timeout, try/catch, UI must render identically without a result.
