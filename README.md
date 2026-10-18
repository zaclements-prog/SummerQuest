# SummerQuest

A kid-friendly summer learning game for elementary students (grades 2-4;
the difficulty tier is set on the student profile).
It combines the strongest patterns from Prodigy (meta-game + avatar), DragonBox
(concept-first visuals), Khan Academy (mastery progression) and SplashLearn
(quick-hit practice games).

Everything runs locally in the browser; progress is saved in `localStorage`.

## What's in it

- **12 subject zones** on an island map, each a 3-step mastery path
  (Learn → Practice → Boss). Difficulty is a **grade tier on the profile**
  (2nd / 3rd / 4th) — set when the player creates their avatar, changeable
  only by a grown-up. Same zones and ladder at every grade; the tier scales
  the numbers, fraction sizes, and reading passages. Multiplication Mesa, Division Dunes, Fraction Falls,
  Place Value Plateau, Measurement Marsh, Geometry Grove, Data Delta,
  Word Problem Woods, Reading Reef, Writing Workshop, Science Summit and
  Tower Battlefront (tower defense where buying a tower costs a math answer).
- **Daily Challenge** — 5 questions from the day's subject, once per (local) day.
- **Tutor** — 11 narrated lessons played as motion graphics: every step is an
  animated scene timed to its narration (`cue('a spoken phrase')`), with
  karaoke captions, replay and animated check questions. Narration comes from
  pre-rendered clips (browser speech as fallback); see
  [`docs/narration-handoff.md`](docs/narration-handoff.md) for re-rendering the voice.
- **This Week's Focus** — finds the skills the child is missing and recommends a
  lesson + practice stage.
- **Daily learning goal** — 2 × 15 minutes of active learning per day earns bonus coins.
- **3D mini-games** where the kid *builds* the answer (the math is the mechanic),
  each a full run with warm-ups, a finale, score, streak and a personal best:
  Crystal Golems (Division Dunes — golems march on the camel pen; throw the
  divisor that shatters one into exactly the quotient's camels; Giant Golem
  finale), Candy Forge (Fraction Falls — stamp 1/d slabs and pour them to fill
  the order exactly), Cloud Keeper (Science Summit — guide Drip the droplet
  around the water cycle; storm rescue finale), Times Grove (Multiplication Mesa
  — plant the rows × columns array yourself). Same stars/coins/tutor award path
  as the 2D stages. Design notes: `docs/superpowers/specs/2026-10-17-mini-games-fun-pass.md`.
- **3D Home** — buy furniture and decorate a room; become (and dress up) a creature; your
  hatched pets toddle around it.
- **Pets** (`/pets`) — every zone has a pet egg: learning there hatches it and grows it
  (baby → kid → grown-up); a grown-up joins the creatures you can become, and one buddy pet
  follows you in the World. Plan: `docs/superpowers/specs/2026-10-18-pets-plan.md`.
- **3D World** — the game's hub: a storybook toon island with a town, a river and an area
  for every subject, and where the app opens. Walk with WASD/arrows or tap/click
  to walk (touch screens too). Walk up
  to an NPC and press E (or tap) to pick a stage and play it without leaving the World;
  you come back where you stood. The **Schoolhouse** (owl teacher) has the
  Daily Challenge, This Week's Focus and all Tutor lessons; the **Library**
  (bookworm) has Reading Reef and the reading/writing lessons. Your **House** is
  your Home room: step inside and "Decorate my room". ⚙️ picks graphics
  (Auto measures the computer and drops shadows/outlines if it's slow).
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

### App-store build (Amazon Appstore for Fire tablets)

```bash
npm run build:store   # → dist/ (VITE_STORE=true), then scripts/check-store-bundle.mjs
```

The build for the child-directed store listing. The local-AI writing feeder is
compiled out (writing uses the built-in grader, and the Parent area has no AI
section), developer helpers stay off, and the post-build check fails if `dist/`
can reach any server: no `/api/llm`, every `fetch()` same-origin, no beacons or
sockets, nothing loaded from another origin. Store paperwork (privacy policy,
privacy labels, content rating, listing draft) lives in `docs/store/`.

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

- `?studio=creatures|anchors|furniture|accessories` on `/home` — model galleries.
- `?studio=all` or `?studio=<areaId>` on `/world` — orbit the island or one area
  (`&cam=dx,dy,dz` sets the camera offset; `?studio=at&x=..&z=..` looks at any point).
- `VITE_DEV_TOOLS=true` in `.env.local` shows "Seed sample week" on
  This Week's Focus (fills in fake attempts — never enable it for the child).
- Narration: after editing lesson text run `npm run tts:dump` (lesson text →
  `narration.json`) and `npm run tts:prune` (drops clips that no longer match).
  Re-render with the local Higgs/Qwen pipeline (`docs/narration-handoff.md`) or
  `npm run tts` (Edge voice, needs internet); `npm run tts:check` validates the
  clips. Steps without a current clip fall back to the browser's speech voice.
- `window.__sqMotionT = 3.2` (dev) pins a lesson's motion graphic at 3.2 s for
  screenshots.

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
  world/               3D World (the hub): layout, terrain, areas, NPC gateways, movement
  toon/                toon art kit: palette, toon materials + outlines, shapes, props
  store/               Zustand stores persisted to localStorage (+ save migrations)
  components/          VisualRenderer, charts, shared UI kit (components/ui)
```

### Art style (toon kit)

Everything 3D is built in code (no model, texture or font downloads, so the
offline single file keeps working) from `src/toon`:

- `TOON` palette — soft sunny pastels shared by the World, Home and creatures.
- `toonMaterial()` — cached `MeshToonMaterial` with a 4-band ramp; the Canvas uses
  `flat` (no tone mapping) so colors land as authored.
- Primitives (`TBox`, `TBlob`, `TCyl`, `TCone`, `TCapsule`, `TSphere`, `TTorus`)
  with optional thin outlines (`outline`) and faceted shading (`flat`).
- Props (`Tree`, `Bush`, `Rock`, `Lamp`, `Fence`, `Bench`…) seeded for
  determinism, and `ToonInstances` for anything repeated.

The World's layout (areas, NPC spots, paths, river, bridges, colliders) lives in
`src/world/worldLayout.ts`; ground, scatter, colliders and tests all read it.
Each area draws itself in `src/world/areas/<Area>.tsx` with its solid parts in
`src/world/areas/colliders/<id>.ts`.

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
- [x] 3D World — toon island with all 12 areas, in-world stage launching,
      Schoolhouse and Library hubs
- [x] Make the World the main hub (2D map secondary; the Home room is the House)
- [x] Touch / tap-to-walk and a graphics-quality setting
- [x] Motion-graphics lessons synced to narration
- [x] Mini-games fun pass (construct-the-answer mechanics, run arcs, juice)
- [ ] Re-render narration with a local Higgs/Qwen voice (`docs/narration-handoff.md`)
- [x] Adaptive difficulty inside a stage (weight the facts a kid misses)
- [ ] Electron wrapper for a "real" desktop app
- [ ] Multi-profile (more than one kid per install)
- [ ] Print/share weekly progress report
