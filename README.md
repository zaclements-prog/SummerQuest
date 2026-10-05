# SummerQuest

A kid-friendly summer learning game for a student going from 3rd to 4th grade.
It combines the strongest patterns from Prodigy (meta-game + avatar), DragonBox
(concept-first visuals), Khan Academy (mastery progression) and SplashLearn
(quick-hit practice games).

Everything runs locally in the browser; progress is saved in `localStorage`.

## What's in it

- **12 subject zones** on an island map, each a 3-step mastery path
  (Learn → Practice → Boss): Multiplication Mesa, Division Dunes, Fraction Falls,
  Place Value Plateau, Measurement Marsh, Geometry Grove, Data Delta,
  Word Problem Woods, Reading Reef, Writing Workshop, Science Summit and
  Tower Battlefront (tower defense where buying a tower costs a math answer).
- **Daily Challenge** — 5 questions from the day's subject, once per (local) day.
- **Tutor** — 11 narrated mini-lessons (pre-generated MP3s, browser speech as fallback).
- **This Week's Focus** — finds the skills the child is missing and recommends a
  lesson + practice stage.
- **Daily learning goal** — 2 × 15 minutes of active learning per day earns bonus coins.
- **3D Home** — buy furniture and decorate a room; become (and dress up) a creature.
- **3D World (beta)** — a voxel island with an area for every subject. Walk up
  to an NPC and press E to pick a stage and play it without leaving the World;
  you come back where you stood. The **Schoolhouse** (owl teacher) has the
  Daily Challenge, This Week's Focus and all Tutor lessons; the **Library**
  (bookworm) has Reading Reef and the reading/writing lessons.
- **Badges, levels, streaks**, a **Progress** screen, and a **Parent Dashboard**
  (stats, optional local-AI settings, reset behind a grown-up check).

## Running it

Easiest: double-click `launch-summerquest.command` (macOS) or
`launch-summerquest.bat` (Windows). On first run it installs dependencies
(~1 minute), then builds the game and opens your browser at
<http://localhost:5173>. Close the terminal window to stop.

Manually:

```bash
npm install
npm run play   # build + serve the game on :5173 (what the launchers run)
npm run dev    # development server with hot reload (also :5173)
```

Both use port 5173 on purpose: the browser keys saved progress by origin, so
switching between them keeps the child's progress.

### Fully offline single file

```bash
npm run build:single   # → dist/SummerQuest.html
```

One self-contained HTML file (JS, CSS and fonts inlined) that opens by
double-click — no server or internet needed. It routes with a URL hash so it
works from `file://`; the writing grader uses its built-in (non-AI) scoring and
lesson narration uses the browser's speech voice.

### Optional: local AI (oMLX)

Writing feedback (and, if a stage is switched to `source: 'llm'`, generated
problems) can use a local OpenAI-compatible server. The dev/preview server
proxies `/api/llm/*` to it and injects the key, so the key never ships in the
bundle. Defaults are `http://127.0.0.1:8000`; override in `.env.local`:

```bash
VITE_OMLX_URL=http://127.0.0.1:8000
VITE_OMLX_KEY=your-key
```

Without the server everything still works: writing is graded offline.

### Developer helpers

- `?studio=creatures|furniture|accessories` on `/home`, `?studio=1` on `/world` —
  model galleries for tuning.
- `VITE_DEV_TOOLS=true` in `.env.local` shows "Seed sample week" on
  This Week's Focus (fills in fake attempts — never enable it for the child).
- `npm run tts` regenerates lesson narration MP3s after editing lesson text
  (needs internet). Steps without a current MP3 fall back to the browser's
  speech voice; a test fails if an MP3 no longer matches its step's text.

## Checks

```bash
npm run lint      # ESLint (incl. React Compiler hook rules)
npx tsc -b        # typecheck
npm test          # vitest
npm run build     # typecheck + production build
```

CI (`.github/workflows/ci.yml`) runs all of these plus the single-file build on
every push and pull request. The test suite includes a content fuzz test that
samples every curriculum stage and checks each problem has exactly one correct
option, no duplicate or NaN options, and correct arithmetic.

## Architecture

```
src/
  App.tsx              routes (HashRouter in the offline build, BrowserRouter otherwise)
  curriculum/          zone + stage definitions (one file per zone) and types
  lib/
    providers/         problem generators per topic (+ static question banks)
    problem.ts         Problem / ProblemProvider types
    llm.ts, llm-cache.ts, prompts/   optional local-AI backend
    analytics.ts, badges.ts, levels.ts, dailyGoal.ts, daily.ts, dates.ts
    stageLocks.ts      the one rule for which stages are playable
    writingGrader.ts   offline writing feedback
    narration.ts, sound.ts, usePlayClock.ts
    home/              3D home catalog, grid and occupancy rules
  games/               ConceptPlay, SpeedRun, BossBattle, WritingPad, tower-defense/
  screens/             map, zone, game runner, daily, tutor, focus, progress, badges, parent…
  tutoring/            lessons, skill taxonomy (skill → zone/lesson/practice stage)
  home/                3D Home (react-three-fiber): models, world, HUD
  world/               3D World (beta): layout, areas, NPC gateways, movement
  store/               Zustand stores persisted to localStorage (+ save migrations)
  components/          VisualRenderer, charts, shared UI kit (components/ui)
```

### Adding a zone

1. Create `src/curriculum/<topic>.ts` exporting a `Zone` whose stages point at a
   `providerConfig` and a `gameId`.
2. If needed, add a provider in `src/lib/providers/` and register it in
   `providers/index.ts`; tag problems with a `skill` registered in
   `src/tutoring/skills.ts`.
3. Add the zone to `src/curriculum/index.ts`.
4. Run `npm test` — the content fuzz test picks up the new stages automatically.

## Pedagogical model

Each zone follows a **3-stage mastery loop**:

1. **Concept** (slow, visual) — represent the idea before abstracting it
   (arrays, fraction bars, place-value blocks, passages, graphs).
2. **Practice** (fast, fluent) — timed drill builds automaticity.
3. **Mastery** (themed) — a boss battle ties effort to a narrative reward.

Stars per stage: 0 (not passed) → 1 → 2 → 3 (perfect), kept as the best result.
A stage unlocks when the one before it has at least one star.

**Adaptive practice** (`src/lib/adaptive.ts`): fact problems (multiplication,
division, equivalent and compared fractions) carry a `factId` such as `mult:6x8`,
and every answer updates a per-fact record in the save. A fact missed this session
comes back 2–3 questions later (never back-to-back, at most twice). Across sessions,
up to ~35% of draws come from the child's recently missed facts that fit the stage's
range (weighted by recency and miss rate); the rest stay random. Two right answers
in a row retire a fact from the boost.

## Roadmap

- [x] All 12 subject zones
- [x] 3D Home — decorate your room and dress your creature
- [x] Daily Challenge with bonus rewards
- [x] Weekly focus: track missed skills and recommend lessons/practice
- [x] 3D World — voxel island with all 12 areas, in-world stage launching,
      Schoolhouse and Library hubs
- [ ] Make the World the main hub (replace the 2D map; fold the Home room into
      the World's house)
- [x] Adaptive difficulty inside a stage (weight the facts a kid misses)
- [ ] Electron wrapper for a "real" desktop app
- [ ] Multi-profile (more than one kid per install)
- [ ] Print/share weekly progress report
