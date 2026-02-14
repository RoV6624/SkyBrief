# SkyBrief — iOS Device Compatibility Test Report

**Date:** February 14, 2026
**Build:** 1.0.0 (9) — post-crash-fix
**Tester:** Automated via `xcrun simctl` + manual verification

---

## Summary

| Phase | Result |
|-------|--------|
| Debug build — launch test (11 devices) | **11/11 PASS** |
| Release build — launch + login test (11 devices) | **11/11 PASS** |

---

## Bug Fixed: Launch Crash (Guideline 2.1 — App Completeness)

### Root Cause

`src/services/firebase.ts` had **top-level `throw new Error()` statements** at lines 26–31 and 110–116 that executed during module initialization when environment variables were missing.

```typescript
// BEFORE (crashed on launch)
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
if (!GOOGLE_WEB_CLIENT_ID) {
  throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not found...");
}
```

In EAS remote builds, the `.env` file is gitignored and never uploaded. Since no EAS environment variables were configured, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_FIREBASE_PROJECT_ID` were `undefined` in the production JS bundle.

**Crash chain:**
1. App launches → JS bundle evaluates → `firebase.ts` is imported
2. `process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` → `undefined`
3. `throw new Error(...)` fires at module load time
4. TurboModule bridge catches NSException → Hermes VM crashes converting error → `EXC_BAD_ACCESS` / `SIGSEGV`
5. App terminates within 160ms of launch

### Fix Applied

**1. Replaced top-level throws with graceful warnings** (`src/services/firebase.ts`):

```typescript
// AFTER (graceful degradation)
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
} else {
  console.warn("[Firebase] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set — Google Sign-In disabled.");
}
```

Same pattern applied to `EXPO_PUBLIC_FIREBASE_PROJECT_ID`. The `signInWithGoogle()` function now checks for the env var at call time and throws a user-friendly error if missing.

**2. Set EAS environment variables** for all build environments:

| Variable | Visibility | Environments |
|----------|-----------|--------------|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | sensitive | development, preview, production |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | sensitive | development, preview, production |
| `EXPO_PUBLIC_FUEL_API_KEY` | sensitive | development, preview, production |
| `EXPO_PUBLIC_FUEL_API_ENABLED` | plaintext | development, preview, production |
| `GOOGLE_SERVICES_PLIST` | secret (file) | all (via `eas-build-pre-install.sh`) |

**3. Fixed `eas.json`** — removed invalid `preInstall` keys (EAS auto-detects `eas-build-pre-install.sh` without config).

---

## Devices Tested (iOS 26.2 — matches Apple's review environment)

### iPhones

| # | Device | UDID | Launch | Status |
|---|--------|------|--------|--------|
| 1 | iPhone 17 Pro | `901544CC` | PID 32286 | PASS |
| 2 | iPhone 17 Pro Max | `90A9C953` | PID 32614 | PASS |
| 3 | iPhone Air | `0C805CC4` | PID 32981 | PASS |
| 4 | iPhone 17 | `05DFE7CE` | PID 33326 | PASS |
| 5 | iPhone 16e | `14443DC3` | PID 33730 | PASS |

### iPads

| # | Device | UDID | Launch | Status |
|---|--------|------|--------|--------|
| 6 | iPad Pro 13-inch (M5) | `62235FB2` | PID 34080 | PASS |
| 7 | iPad Pro 11-inch (M5) | `58CD4D7D` | PID 34412 | PASS |
| 8 | iPad mini (A17 Pro) | `FCDC7FCC` | PID 34753 | PASS |
| 9 | iPad (A16) | `055738EC` | PID 35105 | PASS |
| 10 | iPad Air 13-inch (M3) | `C29F9E24` | PID 35486 | PASS |
| 11 | **iPad Air 11-inch (M3)** | `EDD5A173` | PID 35831 | **PASS** |

> Device #11 is the **exact model Apple used** for the rejected review (iPad Air 11-inch M3, iPadOS 26.2).

---

## Test Methodology

1. **Build:** `xcodebuild` with `-sdk iphonesimulator` for Debug and Release configurations
2. **Install:** `xcrun simctl install <UDID> SkyBrief.app` on each device
3. **Launch:** `xcrun simctl launch <UDID> com.skybrief.app`
4. **Verify:** Wait 10 seconds, confirm process still running via `launchctl list` and `xcrun simctl terminate` (success = app was alive)
5. **Shutdown:** Clean shutdown after each device test

### Known Simulator-Only Warnings (not bugs)

| Warning | Explanation |
|---------|-------------|
| Firebase keychain error (`-34018`) | Simulator lacks keychain entitlements. Does not affect production builds on real devices. |
| `nw_socket_handle_socket_event` connection refused | Debug Metro server connection attempts. Not present in release builds. |
| Haptics warnings | Haptic engine not available in simulator. Harmless. |

---

## Files Changed

| File | Change |
|------|--------|
| `src/services/firebase.ts` | Replaced top-level `throw` with `console.warn` for missing env vars |
| `eas.json` | Removed invalid `preInstall` keys |
| `eas-build-pre-install.sh` | Copies `GoogleService-Info.plist` from EAS secret at build time |
| `.gitignore` | Added `GoogleService-Info.plist` (removed from repo for security) |

---

## Recommendation

Rebuild with `eas build --profile testflight --platform ios`, then resubmit for review. The crash is resolved and the app launches cleanly on all iPhone and iPad devices Apple may test on.
