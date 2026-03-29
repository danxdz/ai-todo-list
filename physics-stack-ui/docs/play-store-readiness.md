# Play Store Readiness (Atoms Release)

## Build + Sync

1. `npm run release:android`
2. `npm run cap:android`
3. Build signed AAB from Android Studio (`Build > Generate Signed Bundle / APK`).

## Product Scope (Current)

1. Atoms mode is primary user flow.
2. Shop entry and full skins lab are hidden by release flags.
3. Shared runtime remains intact for future game themes/modes.

## Pre-Submission QA

1. Test portrait gameplay on small Android phone (safe areas, HUD, no overlap with cup).
2. Test at least one tablet ratio.
3. Validate language switch (`en`, `fr`, `pt`) on home and in-game menu.
4. Validate resume/restart/menu/mute flows.
5. Validate offline launch behavior.
6. Validate first-run and subsequent-run save data (best score, discoveries).

## Store Assets

1. App icon (512 and adaptive icon layers).
2. Feature graphic (1024x500).
3. Phone screenshots (at least 2 per locale used in listing).
4. Short description and full description focused on atoms learning + merge loop.

## Policy + Technical

1. Privacy policy URL published.
2. Data safety form prepared (local storage usage, optional ads if later enabled).
3. Target SDK/version requirements met in Android project.
4. Signed with release keystore and version code bumped.

## Future Re-Enable Plan

When ready, toggle `src/lib/release-flags.js`:

1. `showExperimentalModes: true` to bring back fruit/numbers.
2. `enableShopEntry: true` to expose shop screen.
3. `enableSkinsLab: true` to expose full skin catalog + optional ad unlock flow.

