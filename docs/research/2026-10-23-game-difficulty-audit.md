# 3D games and Tower Battlefront: difficulty by grade

Date: 2026-10-23. Branch `claude/game-grade-tuning-7f2574`.
This audit follows the product review's "retune the 3D games and tower questions for each grade".

**Scope**
- Ranges, tiers, pacing and params only.
- How the next question is picked after a miss belongs to the `missed-facts` branch and is not touched here.
- Tower Battlefront's mechanics wait for the Puddle Patrol rework.

**Method**
- Read the stage sets (`zoneStages`, `src/curriculum/*`), band fallbacks (`lib/gradeBand`), tiers (`lib/gradeTiers`) and each game's own core (`lib/arena`, `lib/forge`, `lib/grove`, `lib/parade` + `lib/gates`, `lib/cycle`, `games/tower-defense`).
- Simulated the planners and providers per grade with seeded scratch scripts.
- Checked the tower gate in the browser at 800×600, 740×360 and 375×812.
- Standards: the K, 1 and 5 lists in `docs/superpowers/specs/2026-10-19-k5-expansion-plan.md`. That spec has no grade 2–4 math section ("2–4: today's stages, unchanged"), so grades 2–4 are checked against CCSS directly.
- `scripts/` has content audits but no playthrough bots for these games. The spec's §8 bot is unbuilt.

## How a game gets its difficulty

These games mostly ignore the stage's `providerConfig`. GameRunner builds a provider from `effectiveConfigForStage`, but:

| Game | Where its numbers really come from |
|---|---|
| Division Arena | `arenaRules(digits, GRADE_TIERS[grade].divMax)` → `arenaFactConfig` / `warmFactConfig`, capped by the pen (`ARENA_LIMITS` ÷9, 10 camels). Grade 5: `TWO_DIGIT_ARENA` via `params.divisorDigits: 2`. |
| Fraction Forge | `forgeFactConfig(GRADE_TIERS[grade].fracEquivMaxDenom)`, capped by the gauge (`FORGE_LIMITS` /12). Grade 5: `makeForgeSumProvider(12)` via `params.mode: 'unlike'`. |
| Times Grove | Its own order bank, filtered by `groveMaxFactor(grade)` (the field is 7 × 7). Grade 5: `planAreaRun` via `params.mode: 'area'`. |
| Critter Parade | `opSetFor(family, grade)` and `maxFactorFor` (`lib/gates/opSets`); the provider only names the topic. |
| Cloud Keeper | Builds its own `scienceCycle` provider; never reads the grade. Grade 5: `g5Spheres` via `params.mode: 'spheres'`. |
| Tower Battlefront | Uses the stage provider through `MathGate`. Grades 2–4: `multiplication` at the tier (2: ×2–5, 3: ×2–10, 4: ×3–12). K / 1 / 5 use their own providers. |

**Who plays what**
- K and 1st never reach Arena, Forge, Grove or Cloud Keeper. Their sets are all `listenPlay`, Critter Parade and Counting Towers.
- Grade 5 has no Critter Parade stage.
- No real grade falls through to an unintended default. A missing profile grade plays 4th grade (`DEFAULT_GRADE`) everywhere.

## Per game × grade

Verdicts: ✅ right · ⬆ too easy · ⬇ too hard · ⚠ fit problem. "Fixed" means changed on this branch.

### Division Arena (`div-arena`, `g5-div-arena`)

All grades play 5 golems: warm, warm, main, main, giant. There is no fail state: a golem that reaches the pen is knocked back. Stars come from first-try clears [1, 3, 5].

Lane times are 19 s for warm-ups, 15 s then 11.4 s for the main golems, and 24 s for the giant. Grade 5's golems walk ×0.75 as fast.

| Grade | Asks (before) | Verdict | Fix |
|---|---|---|---|
| 2 | ÷2–5, quotients 2–5. The warm-ups were the whole range, so golem 1 could be 25 ÷ 5. | ⚠ Steep start. Symbolic ÷ is 3.OA work, but the whole Division Dunes zone teaches ÷ at 2nd grade (owner decision below). | **Fixed:** warm-ups ÷2–3 (dividends ≤ 15). The main golems and giant are unchanged. |
| 3 | ÷2–9, quotients 2–10 (pen cap). Warm-ups ÷2–5. | ✅ (3.OA.7) | none |
| 4 | Exactly grade 3: the tier's ÷12 is capped away by the pen. | ⬆ | **Fixed:** floor 3 (`arenaFloor`). ÷3–9, quotients 3–10, warm-ups ÷3–5. The giant still finds its fact. |
| 5 | ÷11–25, quotients 2–9, dividends ≤ 225. The giant is ×10, so its first crack is "÷10" up to 2,250. | ✅ Mostly. It is late-4th / early-5th work with no remainders. 5.NBT.6 (4-digit ÷ 2-digit) is only reached by the giant. | none (pen model: quotient ≤ 9). Note: ÷20 is allowed here, while `g5Div` excludes multiples of 10. |

### Fraction Forge (`frac-concept`, `g5-frac-1`)

Every run has 6 orders: warm-up, warm-up, rush, rush, and a finale with two orders. Customer patience is bonus-only: 45 / 30 / 60 s. The ruler shows during warm-ups. Stars [2, 4, 6].

| Grade | Asks (before) | Verdict | Fix |
|---|---|---|---|
| 2 | "a/b = ?/d", bases 2–4, targets /4, /6, /8. 8 facts. | ⚠ Equivalence symbols are 3.NF.3. The denominators fit 2.G.3 (halves, thirds, fourths, doubled). | none (owner decision, as for Arena) |
| 3 | 26 facts up to /12. **18 of 26 used 5ths, 9ths, 10ths or 12ths**, outside 3.NF's 2, 3, 4, 6, 8. Any could come first. | ⬇ off-standard | **Fixed:** grade 3 keeps to 2, 3, 4, 6, 8 (`forgeDenominators`). That is 8 facts, the same shelf 2nd grade plays. |
| 4 | Exactly grade 3 (tier /16 clamped to the gauge's /12), ninths included. | ⚠ 4.NF.1's list is 2, 3, 4, 5, 6, 8, 10, 12, 100. | **Fixed:** grade 4 keeps to 2, 3, 4, 5, 6, 8, 10, 12 (24 facts, no ninths). |
| 5 | Unlike-denominator **addition only**, LCD ≤ 12, sum < 1. 59% of orders rename only one fraction. | ✅ for 5.NF.1, partly: no subtraction, no sums ≥ 1, no mixed numbers. | none (new kinds are content, not ranges) |

### Times Grove (`mult-concept`, `g5-mult-1`)

The 2–4 run has 6 orders: 2 labelled warm-ups from the smallest third of the bank, then order → total → missing, then the biggest order as the finale. Par clocks of 18–26 s are bonus-only. Stars [2, 4, 6].

| Grade | Asks | Verdict | Fix |
|---|---|---|---|
| 2 | Arrays up to 5 × 5 (32 orders). The missing-factor round ("5 rows, 20 trees") is built, not recalled. | ✅ (2.OA.4) | none |
| 3 | Up to 6 × 7 (41 orders). | ⬆ slightly. 3.OA.7 is 10 × 10, but the field is 7 × 7. | none (the field is the model) |
| 4 | Up to 7 × 7 (47 orders), so 3rd-grade facts. | ⬆ 4.NBT.5 is multi-digit; the concept stage stays single-digit. | none: owner decision below |
| 5 | Area model. Warm-up 12–39 × 12–29, main 41–98 × 12–98, finale 112–489 × 12–98. 17 picks. | ✅ The 2-digit rounds are 4.NBT.5 review; the finale is 5.NBT.5. | none |

### Critter Parade (`k-count-parade`, `g1-*-parade`, `mult-practice`, `div-practice`)

Every grade plays 3 levels of 4–6 gate pairs. The parade waits at each gate for K–1, and there is no clock. March speed is 4.6 for K–1, 5.4 for grades 2–3, and 6.2 for 4th-grade ×. When picks go badly the parade slows to ×0.75, and slow-mo can be used 3 times.

The gates are comparisons ("×3 or +11?"), not facts to compute exactly. That makes a symbol on gate 1 much gentler here than in a quiz.

| Grade | Gates | Verdict | Fix |
|---|---|---|---|
| K | Dots, + and − to 20; make-ten gates (+7 at 3). | ✅ (K.CC, K.OA.4) | none |
| 1 | + / − within 20 as numerals. | ✅ (1.OA.6) | none |
| 2 | ×2–5 against + (crowd ≤ 100); ÷2–5 against −. | ✅ / ⚠ ×5 can appear on gate 1. Comparing is fine; there is no ramp. | none (it would move the fingerprints for little gain) |
| 3 | × up to 9 on small crowds, doubling past 100. | ✅ | none |
| 4 | × with fraction-of-a-set gates (`mulFrac`); ÷ up to 12 within 100. | ✅ ×, ⬆ ÷: the gate sequences are nearly the same as grades 2–3. | none |
| 5 | No stage. `fracDec` is reachable only through the dev `?grade=` preview. | n/a | none |

Also found:
- In the ÷/− parade the opposing gang is tiny (3–9), so the tug-of-war is almost never lost. In one seed the all-weak path beat the all-smart path.
- The comment at `CritterParade.tsx:163` ("GradeLevel is still 2–4") is out of date.
- `gates/generate.ts:93` gives the "listen" phrasing only to K's `addSub`. 1st grade's sets get the "read" phrasing.

### Cloud Keeper (`science-cycle`, `g5-sci-cycle`)

| Grade | Asks | Verdict | Fix |
|---|---|---|---|
| 2–4 | Identical at every grade. A 40-situation bank. 9 legs: guided loop, windy loop, storm. Only the storm's 55 s rainbow clock is timed, and it is bonus-only. | ⚠ The answer follows Drip's form in a fixed loop (water → evaporation → …), so a child can answer by order without reading the clue. "Condensation" and "precipitation" are beyond 2-ESS2, supported only by icons and the guide. | none. The game's sources are hash-locked (`cloudKeeperSpheres.test.tsx SOURCE_HASHES`), and this is a design change, not a range. |
| 5 | 43 sphere moves. The child picks the destination sphere for each event: real reasoning (5-ESS2-1). | ✅ About 6 moves are grade 2–3 water-cycle steps. Nothing covers 5-ESS2-2 (water distribution). | none |

### Tower Battlefront

The question freezes the game, so there is no time pressure on it.

- **Classic game (grades 2–5):** 10 waves, 75 gold, 10 lives, a 25-gold cannon. Every grade plays the same waves.
- **Counting Towers (K–1):** 3–4 slow waves (×0.6 speed), no clock between waves, and no failing out.
- **Classic stars:** 1 / 2 / 3 at 3, 6 and 10 waves cleared.

| Grade | Questions | Verdict | Fix |
|---|---|---|---|
| K | Counting, then compare, then mixed to 20, with a per-question ramp ([2–5] → [3–8] → [4–10]). | ✅ | none |
| 1 | + / − within 10, small addends first, then mixed to 20. | ✅ | none |
| 2 | ×2–5 shown as bare "4 × 5 = ?". | ⚠ 2.OA.4 is arrays, not recalled facts. | **Fixed:** the gate draws the provider's array under the fact at grade 2 (beside it on a sideways phone). |
| 3 | ×2–10 | ✅ (3.OA.7) | none |
| 4 | ×3–12 | ✅ | none |
| 5 | Fraction and decimal mix: compare, equivalent, add like/unlike, digit value, compare decimals, round, fraction → decimal, scaling. About 45% of the weight is 4th-grade review. | ✅ | none |

Pacing: the classic wave table is the same for grades 2–5. The golden-trace bot (11 towers at fixed spots) loses at wave 10, so three stars is a real stretch at 2nd grade. This is left for Puddle Patrol (owner decision below).

## Changes on this branch

| Commit | Game | Change | Tests / goldens |
|---|---|---|---|
| `0ade13bf` | Fraction Forge | Grade 3: denominators 2, 3, 4, 6, 8. Grade 4: 2, 3, 4, 5, 6, 8, 10, 12. 2nd grade unchanged. Quizzes unchanged: `denominators` is opt-in. | The `forgeUnlike` golden moved for grades 3 and 4; grade 2's held. A new per-grade list test. |
| `7b42b5a4` | Division Arena | Grade 2 warm-ups ÷2–3. Grade 4 floor 3 (÷3–9, quotients 3–10). | `divisionCore` min-2 expectations follow the floor. New range tests. No golden exists. |
| `22b78255` | Tower Battlefront | Grade 2 gate shows the array. | New `g2Towers.test.tsx`. `classicEngine` goldens unchanged. |

## Owner decisions (found, not changed)

1. **Symbolic ÷ and fraction equivalence at 2nd grade.** Division Dunes and Fraction Falls teach these whole zones at grade 2 (tier ÷2–5, /8). The standards would have 2nd grade on equal groups and arrays, and on halves, thirds and fourths of shapes. Changing that is a curriculum call, not a game tuning.
2. **4th grade in the single-digit models.** Times Grove (7 × 7 field) and Division Arena (pen ≤ 10 camels) can't show 4.NBT multi-digit work. Grade 4 now differs from 3 only by a higher floor (Arena) or more denominators (Forge). A 4th-grade multi-digit tier, as grade 5 got, would be new mechanics.
3. **Cloud Keeper's order shortcut** (2–4). The answer follows the fixed loop, so the 40 situations are never really tested. Fixing it means asking form-from-situation or shuffling the forms: a design change to a hash-locked game.
4. **Tower Battlefront pacing per grade.** Grades 2–5 share one wave table. A gentler 2nd-grade table (or speed scale) belongs with the Puddle Patrol rework.
5. **Grade 5 coverage gaps.**
   - The Forge has no subtraction and no sums ≥ 1.
   - The Arena has no remainders and no 4-digit dividends.
   - Spheres have nothing on 5-ESS2-2.
   - There is no 5th-grade Critter Parade stage.
6. **Fraction Falls quizzes at grade 3** still use the tier's /12, outside 3.NF. The new `denominators` option could carry `forgeDenominators` into `effectiveConfig`, but that is outside this pass's 3D/tower scope.
7. **÷ parade balance:** the tiny gang means the tug-of-war is almost never lost (see Critter Parade above).

## Merging with `missed-facts`

- That branch builds the arena's two providers with `makeArenaProviders(rules.facts, rules.warm)`. This branch changes only what `arenaRules` returns, so they compose.
- `FractionForge.tsx`'s `facts` useMemo is edited on both branches: here the classic call becomes `forgeFactConfigForGrade(...)`; there the grade-5 provider becomes a sampler. Expect a small textual conflict on that one line. Keep both.
