# SummerQuest "Coach" — Adaptive Weekly Focus + Tutoring with Audio

**Date:** 2026-06-12
**Status:** Approved design, pending implementation plan

## Context

SummerQuest is a kid-friendly Vite + React + TypeScript learning game (3rd→4th grade) with
12 zones, each a 3-stage mastery loop (concept → practice → mastery). Play history is already
recorded as `SessionRecord[]` in a persisted Zustand store, and `lib/analytics.ts` aggregates
it into per-subject accuracy and daily trends.

The parent wants the program to **adapt week to week**: detect where the student struggled in
the previous week and (1) steer the upcoming week's tasks toward those weak areas, and (2) offer
an interactive **tutoring** section that teaches the core concept behind each weak area, with
**spoken narration** (Microsoft Edge TTS) alongside the on-screen text so he can hear and read
the instruction.

The intended outcome: a closed feedback loop — *play → detect weak areas → learn the concept
(with audio) → practice the exact thing → improve.*

## Goals

1. **Sub-skill weak-area detection** keyed off real play data, finer-grained than the existing
   per-zone accuracy.
2. **"This Week's Focus"** screen that names weak areas and routes the student to *learn* then
   *practice* each one. Non-destructive — links to existing stages, does not mutate curriculum.
3. **Tutoring section**: ~13 hand-authored, interactive lessons covering every teachable concept
   across all 12 zones, reusing the existing visual components, with audio narration and a quick
   comprehension check. (Fractions and place value each get a lesson covering both their
   sub-skills; the Tower Defense zone reuses the multiplication lesson since it drills math facts.)
4. **Audio** via Edge TTS, pre-generated to MP3 at build time, with a browser-speech fallback.

## Non-Goals

- No runtime LLM dependency for lesson content (lessons are authored for accuracy + offline use).
- No inlining of audio into the fully-offline single-file build (targets normal `npm run dev`).
- No changes to the Daily Challenge or World Map task availability (Focus screen is additive).

## Key existing code to reuse

- `src/store/progress.ts` — Zustand store; `SessionRecord`, `recordSession`, `recordAnswer`.
- `src/lib/analytics.ts` — `overall`, `byDay`, `bySubject`, `recentAccuracy` (extend, don't replace).
- `src/lib/problem.ts` — `Problem` (already has `subtopic`, `difficulty`), `ProblemVisual`.
- `src/components/VisualRenderer.tsx` — renders array / fraction / placeValueBlocks / numberLine /
  clock / money / shape / barGraph from a `ProblemVisual`. **Tutoring lessons reuse this directly.**
- `src/components/BarChart.tsx` — used for the week-over-week summary chart.
- `src/screens/GameRunner.tsx` — owns `zoneId`/`stageId`, calls `recordSession`; passes
  `provider`/`params` into games via `GameProps`.
- `src/lib/providers/*` — 13 providers; each gets a small skill-tagging addition.
- `src/curriculum/*` — zone/stage definitions used to map a weak skill → the stage to practice.

## Architecture

### A. Skill tagging + attempt logging (data layer)

1. **`Problem.skill`** — add optional `skill?: { id: string; label: string }` to `Problem`
   (`src/lib/problem.ts`). Each provider populates a **coarse bucket** (target: 2–5 skills per
   topic), e.g.:
   - multiplication → bucket by larger factor family: `mult-f2_5` "2–5× facts",
     `mult-f6_9` "6–9× facts", `mult-f10_12` "10–12× facts".
   - division → by divisor family (mirrors multiplication).
   - fractionCompare → `frac-cmp-likeden`, `frac-cmp-unlikeden`.
   - fractionEquivalence → `frac-equiv`.
   - placeValueIdentify → `pv-identify`; placeValueRounding → `pv-round10`, `pv-round100`, `pv-round1000`.
   - measurement → one per `type` (`meas-area`, `meas-perimeter`, `meas-time`, `meas-money`).
   - geometry → `geo-<level>`; dataGraph → `data-<level>`; wordProblem → `wp-<topic>`;
     readingComprehension → `read-<level>`; writingPrompt → `write-<kind>`; science → `sci-<level>`.
   - **Fallback:** if a provider doesn't set `skill`, analytics derives one from `topic` (+ `subtopic`).
   A small `src/tutoring/skills.ts` holds the canonical skill id → label + zoneId + practiceStageId
   + lessonId map (single source of truth tying skills to lessons and stages).

2. **Attempt log in the store** (`src/store/progress.ts`):
   - New interface `SkillAttempt { id: string; at: number; zoneId: string; topic: string;
     skillId: string; skillLabel: string; correct: boolean }`.
   - New state `attempts: SkillAttempt[]`, capped (e.g. last 2000), persisted; reset in `resetPlayer`.
   - New action `recordAttempt(a: Omit<SkillAttempt,'id'|'at'> & { at?: number }): void`.

3. **Games emit attempts.** Extend `GameProps` (`src/screens/GameRunner.tsx`) with
   `meta?: { zoneId: string; stageId: string }`, supplied by GameRunner. In each game's answer
   handler (where `recordAnswer(isCorrect)` is already called), add one call:
   `recordAttempt({ zoneId, topic: provider.topic, skillId, skillLabel, correct })`, deriving
   `skill` from the just-answered `problem`. Affected games: `SpeedRun`, `BossBattle`,
   `ConceptPlay`, `tower-defense/MathGate`, and `WritingPad` (writing logs a single skill).
   Use a tiny shared helper `skillOf(problem, provider.topic)` in `src/tutoring/skills.ts` so the
   per-game change is one line.

4. **Analytics** (`src/lib/analytics.ts`, additive):
   - `withinDays(attempts, days, now?)` — filter helper.
   - `weakSkills(attempts, { days=7, minAttempts=4, max=5 })` → skills sorted ascending by accuracy.
   - `weakZones(sessions, { days=7 })` → zone accuracy within window (reuses `bySubject` shape).
   - `weeklyFocus(attempts, sessions, now?)` → ranked `FocusItem[]` combining skill + zone
     weakness, each carrying `{ skillId, label, accuracy, attempts, zoneId, lessonId,
     practiceStageId }`. This is what the Focus screen renders.

### B. "This Week's Focus" screen

- Route `/focus` (`src/screens/FocusScreen.tsx`), wrapped in `RequireAvatar` in `App.tsx`.
- Header: this-week-vs-last-week accuracy (a small `BarChart`), built from `byDay`/`weakZones`.
- Body: 3–5 `FocusCard`s from `weeklyFocus()`. Each shows the weak area, its accuracy/attempts,
  and two actions: **📚 Learn it** → `/tutor/<lessonId>`, **🎮 Practice** → `/play/<zoneId>/<stageId>`.
- Empty state when there's no data yet (mirrors `ProgressScreen`'s empty state).
- Add a **🎯 This Week** link to the WorldMap header button row (`src/screens/WorldMap.tsx`).

### C. Tutoring section

- `src/tutoring/types.ts`:
  ```ts
  interface LessonStep {
    id: string
    narration: string           // spoken + shown
    body?: string               // extra on-screen teaching text
    visual?: ProblemVisual      // reuses VisualRenderer
    check?: { question: string; options: ProblemAnswer[]; answer: ProblemAnswer; explain: string }
  }
  interface Lesson {
    id: string; zoneId: string; skillIds: string[]
    title: string; emoji: string; intro: string; steps: LessonStep[]
    practiceStageId: string      // where "Now practice" sends them
  }
  ```
- `src/tutoring/lessons/*.ts` — **~13 authored lessons** covering every concept across the 12
  zones (fractions + place value each cover both sub-skills; Tower Defense reuses the
  multiplication lesson), 2–5 steps each, concise but real; registered in
  `src/tutoring/lessons/index.ts` (`getLesson(id)`, `allLessons`).
- `src/screens/TutorScreen.tsx` (route `/tutor/:lessonId`) — steps the student through
  narration + body + `VisualRenderer`, with audio controls; `check` gives immediate feedback;
  final step shows **"Now practice →"** linking to `practiceStageId`.
- `src/screens/TutorIndex.tsx` (route `/tutor`) — grid of all lessons; weak ones (from
  `weeklyFocus`) badged "Recommended."

### D. Audio narration (Edge TTS)

- **Generator:** `scripts/generate-tts.mjs` — imports every lesson, and for each step renders
  `narration` to `public/tts/<lessonId>/<stepId>.mp3` using the **`msedge-tts`** npm package
  (pure Node, no Python; free Edge endpoint), voice **`en-US-JennyNeural`**. Writes
  `public/tts/manifest.json` mapping `lessonId/stepId → file + a content hash` (so unchanged
  steps are skipped on re-run). New devDependency `msedge-tts`; new npm script `"tts"`.
- **Playback:** `src/lib/narration.ts` + `useNarration()` hook — loads the manifest, plays the
  MP3 via an `Audio` element; on missing file / fetch failure / offline build, falls back to
  `window.speechSynthesis` (pick an en-US voice). Respects `soundEnabled` from the store.
  TutorScreen gets play / pause / replay buttons and auto-plays the current step's narration
  (gated by the existing audio-unlock in `App.tsx`).

### E. Dev-only sample-week seeding (verification aid)

- `src/tutoring/devSeed.ts` exporting `seedSampleWeek()` — populates `attempts` + `sessions`
  with a believable week (some zones strong, a few weak) so the whole loop is visible immediately.
- Surfaced as a small **"Seed sample week (dev)"** button on `FocusScreen`, rendered only when
  `import.meta.env.DEV`. Never ships in a production build.

## Data flow

```
game answer ──recordAttempt()──▶ store.attempts ──┐
game finish ──recordSession()──▶ store.sessions ──┤
                                                  ▼
                              analytics.weeklyFocus(attempts, sessions)
                                                  ▼
                         FocusScreen  ──Learn──▶ TutorScreen ──audio──▶ useNarration → mp3|speech
                              │                       │
                              └──Practice──▶ GameRunner (targeted stage) ──▶ (loop)
```

## Error handling & edge cases

- **No data:** empty states on Focus/Tutor-recommended; `weeklyFocus` returns `[]` cleanly.
- **Thin data:** `minAttempts` guard avoids flagging a skill the student barely touched.
- **Missing/!audio:** narration falls back to `speechSynthesis`; if that's unavailable, text-only.
- **Sound off:** narration does not auto-play; manual replay still allowed.
- **Skill drift:** lessons/stages resolved through `skills.ts`; an unknown skillId falls back to
  its zone's mastery stage + zone lesson.

## Testing / verification

1. `npm run tts` generates `public/tts/**/*.mp3` + `manifest.json` (network required once).
2. `npm run dev`; create an avatar; on `/focus` click **Seed sample week (dev)** → Focus cards
   appear for the seeded weak areas.
3. Click **📚 Learn it** → lesson plays Jenny narration, visuals render, check works, **Now
   practice →** lands on the correct stage.
4. Play the targeted stage; return to `/focus` → that area's accuracy/recommendation updates.
5. Toggle sound off → no auto-narration; replay button still works; disconnect network → falls
   back to browser speech.
6. `npm run build` (type-check) passes; `npm run lint` clean.

## Out of scope (future)

- Audio inlining for the single-file offline build.
- Adaptive difficulty within a stage; multi-profile; deeper multi-session courses per lesson.
