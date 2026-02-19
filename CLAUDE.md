# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkyBrief is a React Native aviation weather briefing app built with Expo SDK 54. It provides pilots with METAR/TAF weather data, AI-generated briefings, weight & balance calculations, route planning, and FRAT (Flight Risk Assessment Tool) functionality.

## Development Commands

```bash
# Start Metro bundler
npm start

# Run on iOS (requires prebuild first time)
npx expo run:ios

# Prebuild native projects
npx expo prebuild

# Install pods (after prebuild)
cd ios && pod install

# EAS builds
eas build --profile development --platform ios
eas build --profile preview --platform ios
```

## Architecture

### Routing (Expo Router)
- Entry: `index.ts` → `expo-router/entry`
- Routes in `src/app/` using file-based routing
- Auth flow: `auth/` → `onboarding/` → `(tabs)/`
- Main tabs: Briefing (index), Route, W&B, Settings

### State Management
- **Zustand stores** in `src/stores/` with MMKV persistence
- Key stores: `auth-store`, `weather-store`, `user-store`, `wb-store`, `pilot-store`
- React Query for server state (`@tanstack/react-query`)

### Styling
- NativeWind (Tailwind for React Native) with custom theme
- Global CSS: `src/global.css`
- Config: `tailwind.config.js` with aviation-specific colors (vfr, mvfr, ifr, lifr)
- Theme tokens: `src/theme/tokens.ts`

### Weather Data
- Direct API calls to aviationweather.gov (no CORS in React Native)
- API client: `src/services/api-client.ts`
- METAR parser: `src/lib/parsers/metar.ts`
- Hooks: `useMetar`, `useTaf`, `useAlerts`, `useAiBriefing`

### AI Briefing
- Local briefing engine: `src/lib/ai/local-briefing.ts` (rule-based, no external API)
- Route briefing: `src/lib/ai/route-briefing.ts`
- Hook: `useAiBriefing` in `src/hooks/`

### Firebase Auth
- Google Sign-In + Email/Password auth
- Requires `GoogleService-Info.plist` in project root
- Service: `src/services/firebase.ts`

### Key Libraries
- `src/lib/` contains domain logic:
  - `alerts/` - weather alert engine with configurable thresholds
  - `minimums/` - personal minimums evaluation
  - `wb/` - weight & balance calculations
  - `frat/` - flight risk assessment
  - `navlog/` - navigation log calculations
  - `interpolation/` - IDW interpolation for ghost stations

### Path Aliases
- `@/*` → `./src/*` (configured in tsconfig.json)

## iOS Build Notes

- New Architecture enabled (`newArchEnabled: true`)
- Requires dev client for custom native modules
- Bundle ID: `com.skybrief.app`
- Location permission required for nearby weather stations
