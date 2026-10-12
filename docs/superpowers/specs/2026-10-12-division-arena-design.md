# Division Arena — first intrinsic-integration vertical slice

Date: 2026-10-12 · Branch: `division-arena` (stacks on `grade-tiers`)
Design basis: Habgood & Ainsworth 2011 (intrinsic integration: +17pts delayed test,
7× time-on-task vs quiz-door); DragonBox concreteness fading; the "controls are a
second job" playability rule for ages 7–9 (no new control scheme: WASD walk only).

## Concept
The Camel trader at Division Dunes sends the player into a sand arena where crystal
golems march in with a **dividend** glowing on their chest. The player walks their
creature onto one of three **divisor crystals** on floor pedestals (grabbing it),
then walks near a golem — the crystal **auto-launches** (no aiming). A divisor that
divides the dividend **shatters the golem into exactly `quotient` mini-camels**
that scamper into a pen (the quotient is *seen*, physically). A non-divisor
bounces off with a wobble — informative, unrewarded, and feeds the existing
within-session retry queue. 5 rounds = one run; stars/coins/session recorded
exactly like a stage play, so the ladder, badges, analytics, and tutor keep working.

The math IS the combat mechanic (Zombie Division pattern). The metaphor IS the
model (grouping/share-out), so the fading step is short: after each throw the
chalkboard writes the real equation `24 ÷ 3 = 8` next to the flying camels.

## Pieces
- `src/lib/arena/divisionCore.ts` — pure logic, node-tested first (skill doctrine):
  - `parseDivProblem(p)` → `{dividend, divisor, quotient}` from the provider's Problem
  - `makeDivisorOptions(dividend, divisor, rng)` → 3 pedestal choices; distractors
    are other true factors when they exist (24 → try 4/6 too), else nearby integers;
    answer position randomized (no position bias)
  - `splitPositions(quotient, rng)` → scatter points for the minis (≤12)
  - `arenaStars(correct, total)` → same star math as stage runs
- `src/screens/ArenaScreen.tsx` — route `/arena/division/:stageId`; Canvas +
  reused `WorldAvatar` walk (bound to arena radius), reused `WorldCameraRig`,
  HUD (round dots, chalk equation strip), end overlay with stars.
- `src/arena/DivisionArena.tsx` — scene: pedestals + crystals (chalk `÷n`),
  golems (rounded boulder + glowing chalk dividend), shatter → mini-camels
  (`Camel.tsx` kit, scaled) running to the pen; sfx via `lib/sound`.
- `src/world/hubContent.ts` — arena row in the Dunes NPC panel (visible only for
  `division-dunes`), href to the arena route.
- `chalk.ts` — add `÷` glyph (bar + two dots).

## Wiring & rules
- Difficulty: `effectiveConfigForStage(div-practice stage, idx, grade)` — grade
  tiers already scale divisor ranges; G2 stays ≤5.
- Facts: round served from `makeDivisionProvider` → `recordAnswer(correct, problem)`
  feeds `factStats` (cross-session boost + within-session retry both inherited).
- Completion: `awardStage('division-dunes','div-practice',stars,score)` +
  `addCoins` + `recordSession` (parity with GameRunner; same result shape).
- No new controls: grab = walk onto pedestal; throw = walk within radius; quit =
  Esc/HUD button. Camera is the existing follow rig, arena radius small (~10 m).
- Exit reuses the World return-spot convention (leave back to /world at the gate).

## Dev/verify hooks
- DEV exposes `window.__sqArena = {state()}`: round, golem {dividend,divisor},
  pedestal options, held crystal, tally, phase — read by headless QA.

## Gate
1. `npx tsc -b` + vitest core tests (distractors valid, split count = quotient,
   no answer-position bias, stars math) — green **before** browser work.
2. Live browser: play 5 rounds headlessly-by-probe (synthetic WASD/teleport via
   DEV hook or direct state drive), screenshot shatter moment, vision QA.
3. Full gate: lint, full test suite, build, build:single. Playtest notes posted.
