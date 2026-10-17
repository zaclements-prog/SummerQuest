# Fraction Forge — second intrinsic-integration slice (Fraction Falls)

> **Superseded in play by the 2026-10-17 fun pass** (`2026-10-17-mini-games-fun-pass.md`).
> The kid no longer picks one of four finished trays. They stamp `1/d` slabs one
> at a time at the press and feed extras to the Beaver. Walking to the table pours
> the stack into a mold exactly as long as the recipe's shade: it fills exactly,
> stops short (stamp the rest) or spills over (the mold tips out). The run has 2
> warm-ups with ruler ticks, rush orders without them, and the Big Bear's
> two-candy finale, then a results card. Pure logic: `pourOutcome`, `stampStack`,
> `forgeRunPlan` and `forgeScore` in `src/lib/forge/fractionCore.ts`. The doctrine,
> fact bounds and parity rules below still hold.

Date: 2026-10-16 · Branch: `fraction-forge` (stacks on `division-arena`)
Design basis: same doctrine as the Division Arena (Habgood & Ainsworth 2011;
DragonBox concreteness fading; the "controls are a second job" rule for ages
7–9 — WASD walk only, no new control scheme).

## Concept
The Fraction Falls smithy pours candy bars to order. Each order is an
equivalence: the recipe strip shows the base fraction as a bar of `b` chunks
with `a` filled (`2/3`), and the measuring gauge is a matching-length bar cut
into `d` empty cells. Three trays of glowing `1/d` slabs (counts = the
provider's options) sit on pedestals. The player walks onto a tray to grab it,
then carries it to the measuring table — the slabs slide into the gauge. The
correct count fills EXACTLY to the recipe's shade (4 sixths = 2/3); wrong
counts visibly fall short or overhang.

**The measurement IS the answer check.** The answer is never printed before the
child measures it: the gauge starts empty and the recipe strip only shows the
base fraction. Distractors are near misses (3 or 5 sixths vs 4) — eyeballing
alone is unreliable, measuring is the tool. After a hit the chalkboard writes
`2/3 = 4/6`, the fading step; the numbers follow the physical check.

## Pieces
- `src/lib/forge/fractionCore.ts` — pure, unit-tested first (skill doctrine):
  - `parseFracEqRound(p)` → `{ baseNum, baseDenom, targetDenom, targetNum }`
    from the provider prompt `a/b = ?/d` (throws if the answer isn't `a·(d/b)`)
  - `FORGE_LIMITS = { denomMax: 12 }` + `forgeFactConfig(tierDenomMax)` —
    never harder than the grade, never wider than the gauge can show legibly
    (mirrors `arenaFactConfig`; the stage asks denominator 12, G4 widens to 16)
  - `fillState(chosen, target)` → `'short' | 'exact' | 'over'` (feedback copy +
    the visual overlap direction)
  - `slabOffsets(n, step)` → centered slab offsets for a tray / gauge row
  - `forgeStars(firstTry, total)` → same 20/60/100% shape as the arena's
- `src/games/FractionForge.parts.tsx` — dumb visual pieces:
  `RecipeStrip` (b chunks, a filled), `Gauge` (d empty cells + fill),
  `SlabTray` (n slabs + slate count card), `HeldTray` (carried overhead),
  `MeasureFlight` (tray arcs to the table, like `FlyingCrystal`), `Forge` decor.
- `src/games/FractionForge.tsx` — scene + flow, mirroring `DivisionArena`:
  all game flow lives here as React state (`view`); the scene is presentational
  and only detects proximity, reporting through callbacks; DEV hook
  `window.__sqForge = { state(), pos(), walk(x, z) }` (honest machine state —
  `walk` teleports and the REAL proximity logic reacts).
- `src/world/town/chalk.ts` — add `/` (tilted bar) and `?` glyphs for the
  equation on the board.
- Wiring: `GameId` union + `GameRunner` case + `frac-concept` stage switches
  `conceptPlay` → `fractionForge` (stage id kept, so any earned stars carry).

## Wiring & rules
- Facts: `makeFractionEquivalenceProvider(forgeFactConfig(effective
  fracEquivMaxDenom))` — `recordAnswer`, `recordAttempt`, the adaptive sampler
  and the within-session retry queue are all inherited.
- Completion: same result shape as every stage
  (`onComplete({ stars, score, correct, total })`); GameRunner handles
  coins/records/session parity.
- Rounds: `params.rounds ?? params.questionCount ?? 5`.
- No new controls: grab = walk onto a tray; measure = walk near the table;
  quit = host chrome. Idle decor + the guide NPC are optional follow-ups.

## Dev/verify hooks
- DEV `window.__sqForge = { state(), pos(), walk(x, z) }`: round, options,
  held, phase, tally — read by headless QA exactly like `__sqArena`.

## Gate
1. `npx tsc -b` + vitest core tests (parse rejects bad prompts, bounds respect
   the tier, fill states, slab layout centering, star math) green **before**
   browser work.
2. Live browser: full playthrough via the dev hook — at least one wrong tray
   (see the short/over feedback) then the win; screenshots of the gauge match
   and mismatch; vision QA.
3. Full gate: lint, full test suite, build. Playtest notes posted.
