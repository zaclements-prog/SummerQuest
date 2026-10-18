# Tablet / mobile app — phase 1 plan

Date: 2026-10-17 · Goal: SummerQuest runs as a first-class app on iPad and Android
tablets (and works well on phones), installed from a home-screen icon, fully offline.

> **Scope update (owner, 2026-10-17):** phase 1 is **mobile view + controls only**:
> workstreams 1 (shell CSS, viewport, compact top bar, iOS audio unlock; *no*
> manifest/service worker/icons), 2 and 3. App packaging (installable PWA and the
> Capacitor native shell, workstream 4) is **deferred** to a later phase; the
> sections about it below are kept as the plan for then.

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

## Phase 1 results (2026-10-17)

GPU draws per frame, counted at the WebGL draw entry points, so shadow passes are
included. Headless Chromium (SwiftShader), 1024×700, before = `9add457`, after =
this phase.

| Scene | Fast before | Fast after | Pretty before | Pretty after |
|---|---|---|---|---|
| World (town square) | 607 | **144** | 1491 | **305** |
| Home | 151 | **125** | 172 | 172 |
| Crystal Golems | 255 | **148** | 443 | **259** |
| Times Grove | 186 | **97** | 258 | **153** |
| Fraction Forge | 235 | **159** | 342 | **244** |
| Cloud Keeper | 236 | **146** | 296 | **201** |

Every scene is inside the ≤ 250 budget on Fast.

**Memory:** JS heap after GC, cycling World → Home → Crystal Golems → map in-app
four times (Pretty):
- before: 127 → 133 → 138 → 144 MB (grows each cycle);
- after: 118 → 119 → 120 → 121 MB (flat).

**Load:** three.js and the 3D scenes now load only with the World, Home or a 3D
game:
- startup bundle 665 → 509 kB;
- stage-runner chunk 217 → 42 kB.

`build:single` still produces one offline file.

## Tablet pass (2026-10-18)

Owner priority: **tablets first**, phones second.

**Audit:** every 2D screen and every non-3D stage, plus the World, Home and the
four 3D games, at real tablet viewports, emulated with touch input:
- iPad mini (744×1062 / 1133×674);
- iPad 10 / Air 11 (820×1106 / 1180×746);
- iPad Pro 13 (1032×1302 / 1376×958);
- a 10" Android tablet (800×1216 / 1280×736);
- iPad Split View at 1/2 (590×746) and 1/3 (375×746).

**Findings and fixes:**
- **Unused space:** the game screens sat in the top half, with 35–45% of the
  screen empty below them. A `roomy:` variant (≥ 700×640) now centres them and
  gives them bigger questions and answer tiles.
- **Landscape layout:** touch tablets in landscape always get the side-by-side
  quiz layout.
- **Boss Battle answers:** on a sideways tablet the answers sat below the fold.
  The layout is now boss | question | answers.
- **Home walking:** no touch way to walk the creature. Play mode now has
  tap-to-walk (taps only; a drag still orbits the camera).
- **Mouse-sized controls:**
  - World Map chip and ⚙️ were mouse-sized (32–40 px); now 48 px on touch;
  - lesson step dots were 28 px wide; now 44 px.
- **Writing pad:** kids on tablets were told "AI server isn't responding". The
  note is now hidden on touch devices.
- **Touch wording:** the 3D games said "WASD" on touch; they now say "Tap to walk".

**Touch checks:**
- World:
  - tap-to-walk works by finger and by Apple Pencil;
  - the Map chip responds to a tap;
  - rotating mid-session resizes the 3D view.
- Home:
  - a tap walks the creature;
  - a drag, a pinch and Decorate mode never start a walk;
  - a Pencil tap walks.
- Games:
  - a Times Grove tap walks;
  - a quiz tap answers;
  - a Tower Defense tap opens the math gate.

**Results:** no horizontal overflow, cut-off controls or page errors at any size.
Only long reading and science passages still scroll.

**Deferred follow-ups (phones):**
- Times Grove in landscape phones is cramped (the stage header takes a row).
- Island-map markers are 40 px on narrow screens. A list of big rows sits under
  the map there.
- Bar-chart answers fall below the fold on portrait phones.

## Verification
- Playwright device emulation (iPhone 13, Pixel 7, iPad gen 7, Galaxy Tab S4) in both orientations, with real touch events.
- Lighthouse-style PWA checks: manifest, SW, offline reload.
- Draw-call and memory numbers on Fast/Pretty.
- Typecheck, lint, all tests, `build`, `build:single`, plus a production preview served offline after first load.
