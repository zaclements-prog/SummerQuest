# Cloud Keeper — water-cycle machine (design)

> **Superseded in play by the 2026-10-17 fun pass** (`2026-10-17-mini-games-fun-pass.md`).
> The kid now guides Drip, a droplet whose shape is the water's state
> (💧 → 💨 → ☁️), to the station whose process comes next. The sun pool
> evaporates, the cold cloud condenses (on the windy loop it drifts and its
> shadow is the station) and the rain peak precipitates; then the river carries
> Drip home. Every station visit is one recorded answer, and the host speaks a
> situation clue from the bank (`nextFor(process)` plus a `short` caption). The
> run has a guided warm-up loop, a windy/snowy loop and a storm finale (three
> friends in mixed shapes, before the rainbow). Pure logic: `routeStep`,
> `cycleRunPlan` and `legScore` in `src/lib/cycle/cycleCore.ts`. The numbered
> stations and the re-arm gate below are gone: stations are edge-triggered.

**Status:** in build (vertical slice) · 2026-10-16 · zone: Science Summit
**CCCS/NGSS:** water cycle (3-ESS2-ish, grade 3–4): evaporation, condensation,
precipitation as an ordered loop.

## Goal

Third intrinsic-integration game (after Crystal Golems ÷ and Fraction Forge
equivalence): a science game where **the cycle IS the mechanic**. The kid runs
the waterfall town's water loop: heat the pond with the sun dial → vapor rises
→ herd it into the cloud → ring the rain gong so it falls on the garden and
flows back. The content questions are *situations in the cycle*; the answer is
*which process* — and answering means walking to that process's station and
performing it.

## Mechanic

The HUD speaks the situation (e.g. "The sun warms the ocean. Water turns into
vapor and rises. This step is called ___."). Three NUMBERED stations ARE the
three answer choices — step onto one to perform its process:

| station | process | walking onto it performs |
|---|---|---|
| `1` sun dial + pond (west) | evaporation | dial spins, vapor puffs rise, pond dips |
| `2` cloud tower (north) | condensation | vapor streams up, cloud fattens and grays |
| `3` rain gong + garden (east) | precipitation | gong rings, rain falls on the garden, pond refills |

The chalk easel shows the round counter (`2/5`) and the trace of steps
performed so far as digits (`3 1 2`) — the chalk font is numeric-only, so the
situation lives in the HUD and the station cards carry the big numerals; the
loop's real order gets taught by the trace.

- Correct → the loop state advances (`applyProcess`), the station performs its
  animation, gold flash; HUD speaks the process's teaching line.
- Wrong → the station performs and STALLS (vapor rises then sinks — nothing
  gathers), the HUD gives a mini-lesson on the tried process, try again.
- Rounds: 5 (`params.rounds`), one situation each.
- **Re-arm gate:** after any resolve the kid is still standing in the ring —
  stations stay inert until the kid has stepped clear of every ring once, so a
  resolve (or a new round) never instantly re-fires under their feet.

## Content

Curated bank in `src/lib/providers/scienceCycle.ts`: ~18 hand-written
situations across the three processes, including "what comes next?" phrasings
(which is where the ORDER of the cycle is taught). Invariants (tested):

- every answer ∈ {evaporation, condensation, precipitation}
- no prompt contains its own answer word (no leaks)
- prompt text unique; answers roughly balanced across the three processes
- shuffled queue with no immediate repeats (mirrors the static science bank)

## Loop state (physical, decorative but honest)

`CycleState { pond 0..1, cloud 0..1, garden 0..1 }`, start `{1, 0, 0.25}`.
Only CORRECT answers apply: evaporation −0.34 pond / +0.12 cloud (vapor seeds
the sky), condensation +0.55 cloud, precipitation −0.55 cloud / +0.34 pond /
+0.4 garden, all clamped. The pond visibly empties and refills; the garden
greens; the cloud builds — the round ladder leaves a physical trace.

## Scoring

First-try clears per round, star thresholds = the arena/forge shape
`[ceil(0.2t), ceil(0.6t), t]` → `[1, 3, 5]` at t=5. `recordAnswer` +
`recordAttempt` per round, skill `sci-water-cycle`.

## Scene (planned constants)

- bound 7.2, spawn [4.9, 5.4], camera [10.5, 8.6, 10.5] (the arena/forge rig)
- POND [-3.6, 0.6] (sun dial on a post), CLOUD [0, -3.6] (tower + sky frame),
  GONG [3.8, 0.4], garden beds between gong and pond (south arc)
- station rings GRAB_R 1.05; colliders r 0.6 (dial post), 1.1 (cloud tower),
  0.6 (gong), pond = circle 1.9 so you stand at the rim
- board: ChalkEasel west, reusing `_shared/ChalkEasel` + `chalkText`
- parts reuse: `GroundRing`, `Decal`/`blobDisc`, toon kit, creature, rig
- dev hook `window.__sqCycle = { state(), walk(x,z), pos() }`

## Wiring

- `GameId` += `'cloudKeeper'`; GameRunner case
- new `ProviderConfig` variant `{ kind: 'scienceCycle' }` + registration;
  `effectiveConfig` case returns config unchanged (fixed curated set)
- Science Summit gains `science-cycle` **at index 1** (Base Camp → Cloud
  Keeper → High Ridge → Professor Hoot), stage id stable, stars carry.
  NOTE: inserting shifts `bankLevels` for later science stages — the same
  reindex `div-arena` took when it was inserted at index 1.

## Non-goals (slice)

- no snow/hail variants, no groundwater/rivers as separate stations
- no true fluid sim: pond/cloud/garden are scale+dissolve visuals
- no LLM content source for this game (curated bank only)

## Acceptance gate

1. `npx tsc -b` · `npm run lint` · `npm test` (core + bank tests green) ·
   `npm run build`
2. live: boot (board + 3 stations + rings), wrong station → stall + teach,
   correct ×3 → loop state visibly advances, 5 rounds → results modal
3. no console errors; commit + tag + push mirror
