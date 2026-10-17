# Tablet / mobile app — phase 1 plan

Date: 2026-10-17 · Goal: SummerQuest runs as a first-class app on iPad and Android
tablets (and works well on phones), installed from a home-screen icon, fully offline.

## Distribution (one web build, two wrappers)
- **Native apps via Capacitor 8** (iOS + Android) are the primary "app".
  - The Vite build is the web layer.
  - Native plugins cover storage, haptics, status bar, splash, back button and keep-awake.
  - Builds, signing and store/TestFlight upload happen on the owner's Mac, as a handoff (see `docs/mobile-app-handoff.md`).
- **Installable PWA** (manifest + service worker) is the zero-install path and the test channel: open the hosted URL and "Add to Home Screen".
- The **offline single file** (`npm run build:single`) stays as it is; no PWA plugin in that mode.

## Device targets
- **First-class:** iPad (9th gen and newer) and mid-range Android tablets, both orientations.
- **Supported:** phones, portrait and landscape. 3D scenes may ask phones to rotate if framing truly needs it.
- **Input:** touch first. Keyboard and mouse keep working everywhere. No hover-only UI, and tap targets are at least 48 px.

## Workstreams
1. **Platform shell + PWA**
   - **Viewport:** `viewport-fit=cover` and iOS meta.
   - **Manifest and icons:** standard, maskable and apple-touch icons.
   - **Service worker:** precache the app shell, fonts, narration MP3s and word timings, with an update prompt.
   - **Shell CSS:**
     - safe-area insets;
     - `dvh` sizing;
     - no overscroll / pull-to-refresh;
     - no double-tap zoom or tap highlight;
     - no long-press menu on game surfaces.
   - **Audio on iOS:** a narration element unlocked on the first gesture and reused.
   - **Storage:** `navigator.storage.persist()`.
2. **Touch and responsive pass**
   - Every 2D screen at phone and tablet sizes, in both orientations.
   - The on-screen keyboard (name entry, WritingPad, parent inputs).
   - Touch decorating in Home (place, move, rotate, pinch/two-finger camera).
   - A compact lesson player on phones.
   - Touch equivalents for every keyboard path.
3. **Mobile performance and robustness**
   - **Draw calls:** a real budget for phones on Fast (≤ about 250 calls), with instancing and merging static decor.
   - **Memory:** dispose geometries, materials and textures when canvases unmount (tablets have little memory).
   - **WebGL context loss:** recovery for iOS background / memory pressure.
   - **Lifecycle:** pause on background.
   - **Load time:** code-split heavy routes (World, Home, games, Tutor scenes).
   - **Graphics setting:** Auto should make sensible calls on coarse-pointer devices.
4. **Capacitor native shell**
   - Dependencies and config.
   - A `src/platform/` bridge that falls back to web APIs: `isNative`, haptics, status bar, splash, keep-awake, Android back button, app state.
   - **Durable storage:** a Preferences-backed storage adapter for the progress store on native, with one-time migration from localStorage and hydration gating.
   - Generated `android/` (and `ios/` if it can be done off a Mac) projects.
   - `npm run cap:*` scripts.
   - The build/sign/ship handoff doc.

## Defaults (owner can change)
- App id `com.summerquest.app`, app name "SummerQuest".
- Orientation: both. The 3D World and games are tuned for landscape and still usable in portrait.
- Local-AI writing grading is a desktop-only extra. On mobile the offline heuristic grader is used and the parent setting is hidden.

## Verification
- Playwright device emulation (iPhone 13, Pixel 7, iPad gen 7, Galaxy Tab S4) in both orientations, with real touch events.
- Lighthouse-style PWA checks: manifest, SW, offline reload.
- Draw-call and memory numbers on Fast/Pretty.
- Typecheck, lint, all tests, `build`, `build:single`, plus a production preview served offline after first load.
