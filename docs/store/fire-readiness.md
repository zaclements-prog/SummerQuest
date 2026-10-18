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
| Low-end performance | ✅ / ⚠️ 2D screens are interactive in about 1 s and 3D in about 3 s at 6× CPU throttle. See [Performance](#performance). Confirm on a real Fire 7. |
| Kid safety / COPPA | ✅ No ads, no analytics, no SDKs, no network. `npm run build:store` compiles out the AI writing feeder and fails on any network use. Parental gate on the Parent area and every grown-up setting. Store build sweep: 70 routes, 0 errors, 0 outside requests. See `privacy-policy.md`. |
| Store assets | ✅ Icons 512×512 and 114×114 (`assets/`). ✅ Screenshots 1920×1200. ⏳ Listing text: `listing-draft.md`. |
| Packaging for Fire OS | ⏳ **Not started.** This is a decision for the owner (see [Packaging](#packaging)). |
| Real-device check | ⏳ Owner: run on a physical Fire tablet before submitting (see [Before you submit](#before-you-submit)). |

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

  Status: a root error boundary turns a crash or a failed screen load into a friendly "Oops!" screen. Everything goes silent when the app is backgrounded (sound effects, narration, speech), and a lesson's voice and pictures pause together. Back-button handling belongs to the packaging step (below).

## Packaging

The web app has to be wrapped for Fire OS. Fire tablets run web content in
**Amazon WebView**, a Chromium build (about Chromium 120–124 on Fire OS 8), so the app
runs unchanged inside either wrapper:

1. **Android app via Capacitor (recommended).** A small native shell around the built `dist/`.
   - We control:
     - the **Back button**: go back a screen, or leave from the World;
     - **full-screen** play: hide the status and navigation bars, which gives Fire 7 / HD 8 their full 600 px height;
     - keep-awake during lessons, splash and icon, and durable storage.
   - Builds an APK for upload to the Amazon Developer Console. No Google Play services are needed.
2. **Amazon packaged web app.** Upload the built files as a ZIP with a launch page.
   - Less work, but less control: no native Back handling, full screen, or keep-awake.
   - Unknowns to test on a device: the page origin, and whether storage persists across updates.

**Wrapper requirements** (whichever path):
- **Network:** request **no** INTERNET permission (or never load a remote URL).
- **Permissions and SDKs:** no other permissions, and no SDKs.
- **Backup:** set `allowBackup="false"`.
- **Routing:** serve `index.html` for any app path. The app uses path routes, and "Restart" reloads the current one. Capacitor's local server already does this.
- **Speech:** check that text-to-speech uses the on-device voice. It is only a fallback; the narration is recorded.

**Recommendation:** Capacitor. It is the path Amazon's test criteria (Back, soft keys,
backgrounding) are easiest to satisfy on. The earlier Capacitor groundwork was set
aside when packaging was deferred, and can be resumed.

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

## Owner decisions

- **Packaging:** Capacitor APK (recommended) or Amazon packaged web app.
- **Four narration lines** worth re-recording. The text change would make their clips stale, so they were left as is:
  - `division/share`: "shared with three friends" → "shared equally among three friends" (as written, it could mean four people);
  - `geometry/shapes`: a square has four *square* corners;
  - `writing/example`: "what the dog does" → "did";
  - `geometry/count`: "Let us check" → "Let's check".
- **Grade scope:** a few items run above their grade's standard:
  - grade-2 mixed measurement includes perimeter, elapsed time and change from $10;
  - grade-3 equivalent fractions include fifths and tenths;
  - grade-4 "enrichment" includes averages and angle sums.
- **Privacy policy:** a contact email, an effective date, and a public URL to host it at (Amazon's listing asks for it).
- **Name:** check that "SummerQuest" is clear to use as an app title in your market.

## Before you submit

1. Install the packaged build on a **Fire 7 or Fire HD 8** (the slowest targets) and a Fire HD 10.
   - Play the World, one 3D game, one lesson with sound, and the writing pad with the on-screen keyboard.
   - Rotate mid-game, and press Home and come back.
2. Use Amazon's **Live App Testing** (beta) to put it on family devices.
3. Fill in the Developer Console from `listing-draft.md`, `content-rating.md` and `amazon-privacy-labels.md`. Upload `assets/` and the screenshots, and set the target audience to children.
