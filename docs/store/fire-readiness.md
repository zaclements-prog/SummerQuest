# Amazon Appstore (Fire tablets): production readiness

Date: 2026-10-18. Target: the Amazon Appstore for **Fire tablets**, listed as a
**child-directed education app** for ages 7–9 (US grades 2–4).

This page tracks where we stand against Amazon's requirements, what the production
QA passes found and fixed, and what still needs a decision or a step outside the code.
The store-listing documents sit beside it in `docs/store/`.

## Status at a glance

| Area | Status |
|---|---|
| Content correctness (math, text) | ✅ Fuzz-tested every stage at every grade. Generator bugs fixed. Copy proofread. |
| Every activity completes | ✅ 32 2D stages, 11 lessons, the Daily Challenge and all 4 3D games play to their result screens. Progress and coins save. |
| Fire tablet layouts | ✅ Fire 7, HD 8, HD 10 and Max 11, both orientations, with system bars showing. |
| Touch / Pencil / rotation | ✅ Tap-to-walk everywhere (World, Home, games). Drags and pinches never misfire. The view survives rotation. |
| Production build health | ✅ 70 routes and 0 page errors on the production build. |
| Low-end performance | ✅ Fire HD 8 (2022): every 3D screen and lesson ~57–60 fps in both orientations. ✅ Fire HD 10: 3D ~58–59 fps; lessons 44–55 fps while narrating (GPU-bound on its bigger screen). ⏳ Fire 7 not yet tested. See [Performance](#performance). |
| Kid safety / COPPA | ✅ No ads, no analytics, no SDKs, no network. `npm run build:store` compiles out the AI writing feeder and fails on any network use. Parental gate on the Parent area and every grown-up setting. Store build sweep: 70 routes, 0 errors, 0 outside requests. See `privacy-policy.md`. |
| Store assets | ✅ Icons 512×512 and 114×114 (`assets/`). ✅ Screenshots: 7 at 1920×1200 in `screenshots/` (World, two lessons, Times Grove, Candy Forge, map, welcome; Pretty graphics, Fire HD 10 page size). ⏳ Listing text: `listing-draft.md`. |
| Packaging for Fire OS | ✅ Capacitor Android app in `android/` (2026-10-18). Debug APK builds and passes the emulator checks. ⏳ Release signing key (owner). See [Packaging](#packaging). |
| Real-device check | ✅ Fire HD 10 and ✅ Fire HD 8 (both Fire OS 8.3), 2026-10-18. ⏳ Fire 7 still to do (see [Packaging](#packaging)). |

## What Amazon requires, and where we stand

- **Child-Directed App (COPPA) policy.**
  - Requirements:
    - age-appropriate content;
    - COPPA compliance;
    - no Amazon Advertising or Associates ads aimed at children;
    - only "child-suitable" SDKs.
  - Where we stand: the app has no ads, no analytics and no third-party SDKs. Nothing leaves the device.
  - Progress, the child's first name or nickname, and settings live in on-device storage only.
  - The optional local-AI writing grader (a desktop dev extra that posts the child's writing to a local server) is **compiled out** of the store build. `npm run build:store` fails on any trace of it, and on any fetch, beacon, socket or remote import that isn't same-origin.
  - **Parental gate:** "Grown-ups only: what is 23 × 17?", typed answer, no hints, a 30-second lockout after 3 misses, open for 10 minutes in memory only. It guards the Parent area, reset and grade change.
- **Privacy Labels.** Answers are in `amazon-privacy-labels.md`: no data collected or transmitted.
- **Content rating questionnaire.** Answers are in `content-rating.md`. There is mild cartoon fantasy conflict (boss battles, golems, tower defense) and no realistic violence.
- **Images.** The large icon must be 512×512 and the small icon 114×114, both PNG with transparency. They are in `assets/`. Screenshots: 3–10 at a supported tablet size; we provide 1920×1200 (Fire HD 10).
- **Test criteria.** Amazon checks:
  - launch, and that nothing crashes or force-closes;
  - correct button behavior (including Back);
  - navigation;
  - behavior on Fire devices: status bar, soft keys, and the app going to the background.

  Status: a root error boundary turns a crash or a failed screen load into a friendly "Oops!" screen. Everything goes silent when the app is backgrounded (sound effects, narration, speech), and a lesson's voice and pictures pause together. Back is handled by the Capacitor app (see [Packaging](#packaging)).

## Packaging

(Amazon stopped accepting new *web* apps on Oct 31, 2024, as its Developer Console notes, so an Android package is the only route.)

**Done: Capacitor Android app** (`capacitor.config.ts`, `android/`, Capacitor 8). Fire
tablets run it in Amazon WebView (Chromium), and the web app runs unchanged inside it.

| Requirement | How it is met |
|---|---|
| No network | The manifest requests **no permissions at all**, not even INTERNET. Capacitor serves `dist/` from inside the APK. |
| No SDKs | Only Capacitor core and two Capacitor plugins (`@capacitor/app` for Back, `@capacitor-community/keep-awake`). No analytics, ads or Google Play services. |
| Backup | `allowBackup="false"`. |
| Back button | `src/platform/native/`: goes back a screen. On the World or Welcome it leaves the app. With nothing to go back to, it returns to the World. |
| Full screen | `MainActivity` hides the status and navigation bars. A swipe from the edge shows them briefly. |
| Backgrounding | The WebView pauses with the activity, so the page goes hidden and the app's existing silence-on-hidden code runs. |
| Keep-awake | The screen stays on only while a lesson is open. |
| Routing | Capacitor's local server serves `index.html` for every path. |
| Icon / splash | SummerQuest icon at every launcher density. The splash is the icon on the sky gradient. |

**Build:**
- `npm run android:sync` runs the store build (with its no-network check) and copies it into `android/`.
- `npm run android:apk` builds a debug APK at `android/app/build/outputs/apk/debug/app-debug.apk`.
- `npm run android:release` builds the release APK/AAB. It needs the signing key below.

The toolchain is JDK 21 (`brew install openjdk@21`) and the Android SDK at
`~/Library/Android/sdk`, with platform 36 and build-tools 36. Set `JAVA_HOME` and
`ANDROID_HOME`, or write `sdk.dir` in `android/local.properties`, which is not committed.

**Emulator check (2026-10-18)**, on Android 14 with WebView 113, 1280×800 (Fire HD 8 size):
- The APK installs and launches offline and full screen.
- First run works: Welcome → create an explorer → the 3D World renders.
- Back works: create explorer → Welcome, Map → World, and World → leaves the app.
- A cold restart keeps the explorer and progress.
- Lesson narration plays, and the screen stays on. On Home, both audio streams stop. On return, they resume. Leaving the lesson lets the screen sleep again.
- Rotating to portrait mid-app re-lays out without restarting the app.

**Real Fire tablet (2026-10-18):** Fire HD 10 (KFTUWI, 1920×1200), Fire OS 8.3.3.8, Amazon WebView 148. Debug APK installed over USB with ADB.
- Cold start takes 1.4 s and opens full screen in landscape.
- First run works, and the World's first 3D frame appears within 3 s. The World shows the touch hint ("Tap or hold to walk"), and tap-to-walk works.
- Back works: with the on-screen keyboard open, Back closes the keyboard and stays on the screen. Map → Back returns to the World.
- A lesson plays narration and keeps the screen on. On Home, the audio stops. Back in the app, the narration resumes. Leaving the lesson lets the screen sleep again.
- No crashes in the log. The test explorer was cleared afterwards.
- Still to check on a **Fire 7**, the slowest target. The Fire HD 8 passed: see [Performance](#performance).

**Still to do (owner):**
- **Release signing key.** The build is wired (`android/app/build.gradle` reads `SQ_RELEASE_*` from `~/.gradle/gradle.properties`); the key itself is yours to create, once:
  `bash scripts/new-release-key.sh`. It runs keytool (you type the password), stores the key in `~/.summerquest-keys/` outside the repo, and prints the four `gradle.properties` lines. **Back up the key file and its password.** Then `npm run android:release` builds `app-release.apk`, signed. Without the key the release build comes out unsigned. Verified with a throwaway key: signed, no INTERNET permission. Amazon re-signs the upload with its own certificate for your account.
- **Version.** Set `versionCode` and `versionName` in `android/app/build.gradle`. They are now 1 and "1.0". Bump `versionCode` on every upload.
- **App ID.** `com.summerquest.app`: confirmed by the owner (2026-10-18). It is permanent once published.

## Quality passes (2026-10-18)

1. **Content QA.**
   - A fuzz suite (`src/lib/providers/__tests__/contentFuzz.test.ts`, 57 tests) draws 400 problems per stage and grade. For each problem it checks the answer, unique options, clean text, and that the answer matches what the picture shows.
   - It found and fixed 8 generator bugs, including:
     - fifths and tenths served to 2nd graders;
     - place-value numbers printed in the device's locale (e.g. `12.345` on a German tablet);
     - three-digit "giant" golems;
     - water-cycle prompts with no question in them.
   - About 100 kid-facing text fixes.
2. **Full playthrough bot** on Fire HD 8 landscape. It played every 2D stage to its result screen with correct answers, checked that stars saved, then played all 11 lessons (answering their quick checks) and the Daily Challenge. Result: 44/44, with no errors.
3. **3D games.** Crystal Golems, Times Grove, Candy Forge and Cloud Keeper each played a full run to their results through their QA hooks, with no errors. Crystal Golems and Times Grove both finished with 3 stars, and the Giant Golem stayed two-digit (98).
4. **Fire layout audit.** Every screen on Fire 7, HD 8, HD 10 and Max 11, in both orientations, with Fire OS bars showing.
   - Problem: a Fire 7 or HD 8 held sideways (about 1024/960 × 528) fell between the phone and tablet layouts.
   - Fix: they now get the compact layout. Sideways boss battles keep their answers on screen, and the Tower Defense board sits beside its shop.
   - Result: pages that scroll during play dropped from 33 to 11, and those 11 are long reading or science passages.
5. **Production console sweep.** 70 routes on the production build at Fire 7 size gave 0 page errors.
   - The only failed requests were to the AI writing grader, which the store build removes.
   - Warnings are limited to a three.js deprecation notice and Chrome's "audio waits for the first tap".
6. **First launch.** A fresh install runs welcome → create your explorer → the World, with no errors.

## Performance

Measured on the production build at Fire 7 size with the CPU throttled 6× (a stand-in for
the Fire 7's quad-core A53). It runs in a software-GL browser here, so 3D numbers are pessimistic.

| Screen | First paint | Interactive / first 3D frame | Main thread settles |
|---|---|---|---|
| Island map, lessons, quizzes | 0.8–2.6 s | about 1–1.8 s | about 1.5 s |
| Home | 1.2 s | first 3D frame 3.0 s | 3.1 s |
| World | 1.1 s | first 3D frame 3.0 s | 8.2 s (was 10.3 s before batching was spread over frames) |
| Times Grove (3D game) | 0.8 s | first 3D frame 2.9 s | about 12 s, as the scene settles |

- **Pets** (measured again the same way, on the same day, against the build before pets):
  - **World with a buddy pet:** the same first frame as without, about 6 s here (this machine ran slower than for the table above).
  - **Home with six pets:** the first 3D frame is unchanged, because the pets walk in one at a time after the room is up.
  - **Cost of the pets:** three extra shader variants, compiled once per visit as the first pets arrive. Software GL makes that compile slow here; a tablet GPU is much quicker.
- Tablets start in **Fast** graphics and step up to Pretty only if the device proves smooth.
- Every 3D screen stays under 250 draw calls per frame on Fast.
- **Watch on a real Fire 7:** the first seconds of the World and the 3D games, while the scenery is merged.

### Fire HD 8 (2022), the low-end check (2026-10-18)

**Device:**
- KFRAWI: MediaTek MT8169A with six Cortex-A55 cores (no big cores) and a Mali-G52 MC2 GPU (the same GPU as the HD 10).
- 2 GB RAM; 1280×800 at 1.33× density.
- Fire OS 8.3.3.8 with Amazon WebView 148.

**Checks:** the debug APK from `master` (after PR #10) passed the smoke test: first run, the World, Map → Back → World, a restart that keeps the explorer, and no crashes. Cold start takes 3.7 s; 1.8 s once warm.

**Measured with `fire-perf.mjs`** at full speed, no throttling. Lessons were started with a real tap, and "after" means after the narration ends.

| Screen | Portrait | Landscape |
|---|---|---|
| World | 59.7 fps (110k tris) | 58.6 fps (194k tris) |
| Home / Pets | 60 / 60 | 60 / 60 |
| Times Grove / Candy Forge | 60 / 60 | 60 / 60 |
| Lessons, playing: Multiplication, Division, Fractions, Place Value | 52*–60 | 60, 60, 60, 60 |
| Lessons, playing: Word Problems, Science | 56, 56 | 58–59, 57–58 (2 repeats) |
| Lessons, after the narration | 60 | 60 |

\* Multiplication's portrait average includes one 0.8 s pause as the lesson loads; its frames were otherwise steady. One landscape pass had a single slow run each for Word Problems and Science (about 40 fps). Neither repeated in two more runs, most likely background activity on a freshly woken tablet.

**Why the HD 8 beats the HD 10 on lessons:** both have the same GPU, and lessons are limited by redrawing the vector stage. The HD 8's smaller, lower-density screen has about 40% as many pixels to fill. Its slower CPU (all little cores) didn't show up as a limit anywhere. The heavier the screen fill, the more the HD 10 is the device to watch.

### On a real Fire tablet (2026-10-18)

Measured on the Fire HD 10 (Fire OS 8.3, Amazon WebView 148) with `scripts/fire-perf.mjs`. It attaches to the
debug APK over USB and counts frames, draw calls and triangles, and can CPU-profile.
"3× CPU" slows the page's CPU threefold with DevTools throttling, roughly a Fire 7's quad Cortex-A53.
It shows the CPU side only.

| Screen | Before: fps (p95 frame) | After | After, 3× CPU (before → after) |
|---|---|---|---|
| World | 49.7 (33 ms) | **58.7 (17 ms)** | 36 → **48** |
| Home | 49.5 (33 ms) | **55–59 (17 ms)** | 60 → 60 |
| Times Grove | 56.9 (33 ms) | **58.7 (17 ms)** | 60 → 60 |
| Candy Forge | 53.4 (33 ms) | **58.7 (17 ms)** | 40 → **53** |
| Pets | 52.9 (33 ms) | 57 | — → 59 |

**Lessons (motion graphics).** These were the slowest screens. The vector stage was re-rendered and re-rasterized every frame, with live blur filters, and every scene kept moving forever. Measured on the Fire HD 10 in landscape, lesson started with a real tap (`fire-perf.mjs --tap "Watch#n"`); `master` before vs `lesson-perf`:

| Lesson | Playing fps | GPU time per 5 s after the narration | Raster time per 5 s after |
|---|---|---|---|
| Multiplication | 35.5 → **47.6** | 4,136 → **1,521 ms** | 1,101 → 270 ms |
| Division | 46.6 → **50.7** | 3,735 → **1,502 ms** | 1,269 → 301 ms |
| Fractions | 32.7 → **44.1** | 3,798 → **2,308 ms** | 585 → 213 ms |
| Place Value | 53.8 → **54.7** | 3,142 → **1,970 ms** | 1,079 → 255 ms |

What changed: on touch devices the stage redraws at a steady 30 fps and holds its last frame 1.5 s after the narration; glows are gradients, not blurs; and stage filters are off. Still open:
- Drawing the stage at 1× instead of 1.5× (2.25× fewer pixels; check that text stays crisp).
- Trimming the heaviest scenes (word problems, science: 300+ SVG elements).

What made the difference:
- **World CPU.** The static batcher kept ~1,800 merged-away meshes in the scene, and three.js walked all ~3,000 objects every frame.
  - Merged leaves are now frozen: no matrix updates.
  - Leaves that React owns are taken out of the tree until they change.
  - The World now walks ~1,000 objects per frame.
  - Areas out of the camera's view are hidden as a whole (`StaticBatch cull`). The island fills most of the view, so this helps most near the edges.
- **Triangles.**
  - On phones and tablets, instanced rounded boxes (fences, shingles, crates) use one bevel step: 108 triangles instead of 300.
  - The island's trees, bushes and rocks are split into 24-unit tiles, so off-screen tiles aren't drawn.
  - World triangles went from 297k to 194k per frame, and Times Grove's from 99k to 67k.
- **Background blur.** Touch devices skip `backdrop-filter`: Home's toolbar blurred the live 3D view on every frame.
- **Game clocks.** Candy Forge's patience clock and Cloud Keeper's storm clock no longer re-render the whole 3D scene 4× a second. A small `TickingSoftClock` ticks on its own.
- Unchanged: tablets still start in Fast graphics (1× pixels, no shadows or outlines). Going from 1× to 0.6× pixels made no difference on the HD 10, so it is not fill-rate bound.

Not measured here:
- Cloud Keeper and Crystal Golems are locked for a new explorer. They get the same engine fixes, and Cloud Keeper also gets the clock fix.
- A real Fire 7 / HD 8 is still the final word.

To measure again, connect the tablet over USB, then run `npm run android:apk`, install the APK, and run
`node scripts/fire-perf.mjs /world /home --throttle 3`. Add `--profile` for the CPU hot spots.

## Owner decisions

- ~~**Packaging**~~: done. Capacitor APK (see [Packaging](#packaging)).
- **Four narration lines** worth re-recording. The text change would make their clips stale, so they were left as is:
  - `division/share`: "shared with three friends" → "shared equally among three friends" (as written, it could mean four people);
  - `geometry/shapes`: a square has four *square* corners;
  - `writing/example`: "what the dog does" → "did";
  - `geometry/count`: "Let us check" → "Let's check".
- **Grade scope:** a few items run above their grade's standard:
  - grade-2 mixed measurement includes perimeter, elapsed time and change from $10;
  - grade-3 equivalent fractions include fifths and tenths;
  - grade-4 "enrichment" includes averages and angle sums.
- ~~**Privacy policy**~~: done. Contact zaclements@gmail.com, effective October 18, 2026, live at https://zaclements-prog.github.io/summerquest-site/privacy/
- **Name:** check that "SummerQuest" is clear to use as an app title in your market.

## Before you submit

1. Install the packaged build on a **Fire 7 or Fire HD 8** (the slowest targets) and a Fire HD 10.
   - Play the World, one 3D game, one lesson with sound, and the writing pad with the on-screen keyboard.
   - Rotate mid-game, and press Home and come back.
2. Use Amazon's **Live App Testing** (beta) to put it on family devices.
3. Fill in the Developer Console from `listing-draft.md`, `content-rating.md` and `amazon-privacy-labels.md`. Upload `assets/` and the screenshots, and set the target audience to children.
