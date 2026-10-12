# Grade Tiers — Design Spec

**Date:** 2026-10-12 · **Scope:** student profile, providers, static content banks, stage copy, curriculum title.
**Decided by the owner:** difficulty is a **static grade setting on the student profile** (2/3/4). No in-game promotion between tiers for now — a future progression system can key off the same profile field without redesign.

## Decisions
- **One grade per profile**, chosen at avatar creation ("What grade are you finishing this spring?"), editable only in the Parent Dashboard behind the grown-up check.
- **Grades in v1: 2, 3, 4.** The type allows `5` later (5th-grade content = authored content, no engine change).
- Existing saves migrate to `grade: 4` (matches today's "3rd → 4th" behavior).
- **Curriculum stays flat** (12 zones × 3 stages, no per-grade zone files). The profile grade scales difficulty *inside* each stage; stage unlock order is unchanged.
- Provider configs keep their meaning as *topic selectors*; a per-grade **tier table** supplies the difficulty knobs. Explicit per-stage overrides remain possible for special cases (e.g. tower defense stays on multiplication at the tier's factor range).
- Concept → Practice → Mastery keeps its pedagogy; only numbers, bank filters, and a few labels change per grade.

## Profile plumbing
- `GradeLevel = 2 | 3 | 4` exported from `src/store/progress.ts`; `player.grade` lives on the persisted `AvatarChoice`.
  - Persist shape: `player: { emoji, color, name, grade }`. Old saves have no `grade` → `migrate` (bump persist `version` to 2) fills `grade: 4` when `player` exists, leaves `player: null` alone.
  - New action `setGrade(grade: GradeLevel)`; `resetPlayer` unchanged (nulls the player).
- `AvatarCreate` adds the grade picker (three cards: 2nd / 3rd / 4th, each with a one-line "what you'll practice" blurb). Required before Begin, like name.
- `ParentDashboard` shows the grade as an "Edit" row using the existing grown-up gate UI.
- Curriculum meta: `title` drops the hard-coded "3rd → 4th" → "Summer Quest"; `gradeRange` reads from the active profile at the (few) display sites, defaulting to "2nd–4th grade" when no player.

## Tier tables — `src/lib/gradeTiers.ts` (new, pure)
```
export const GRADE_TIERS: Record<GradeLevel, Tier>
```
`Tier` holds the knobs every procedural provider needs, all in existing config types:

| knob | G2 | G3 (≈ today) | G4 (≈ today's ceiling +) |
|---|---|---|---|
| mult factors | 2–5 | 2–10 | 3–12 |
| div divisor / quotient | 2–5 / 2–5 | 2–10 / 2–10 | 2–12 / 2–12 |
| fraction maxDenominator (equiv / compare) | 8 / 8 | 12 / 10 | 16 / 12 |
| placeValueIdentify maxPlace | 1 000 | 10 000 | 100 000 |
| rounding maxPlace / roundTo | 1 000 / 10 | 10 000 / 100 | 100 000 / 1 000 |
| measurement | area+perimeter, whole units | + time, money (mixed) | mixed + harder conversions |
| bank `level` filter | 2 | 3 | 4 |

`effectiveConfig(stage, grade)` resolves `stage.providerConfig` → concrete numbers by grade (identity for kinds with no knob, e.g. writing prompts). Pure and unit-tested; **GameRunner / DailyChallenge call it before `createProvider`** — providers stay boring.

## Providers
- **Procedural** (multiplication, division, fractionEquivalence/Compare, placeValueIdentify/Rounding, measurement): signature unchanged — they receive already-tiered configs.
- **Static banks** (geometry, dataGraph, reading, science, wordProblem): question records gain `level: 2 | 3 | 4`; the bank provider filters by the grade from `effectiveConfig`. Today's level-3 questions stay level 3; today's level-4 stays 4; new grade-2 content is authored fresh (not just relabeled).

## Content authoring (the long pole, tracked as its own phase)
- Geometry: +~25 G2 items (shape recognition → today's L3 below today's), +~10 L4 enrichment.
- DataGraph: +~15 G2 (picture/bar read-the-fewest), +~10 L4 enrichment.
- Word problems: split bank by grade; G2 = single-step add/subtract within 100 + easy groups; G3 keeps the current bank; G4 gains multi-step.
- Reading: current 22 passages stay on the G3/G4 shelves; author **~12 new G2 passages** (short, decodable, high-interest) and ~5 new G4.
- Science: same shelf plan (~10 new G2 passages, ~5 G4).
- Writing prompts: per-grade prompt lists (sentence / paragraph / story already exist — copy swaps by grade).
- Narration: only if lesson *steps* change text; then `npm run tts` (the drift test enforces MP3↔text sync).
Answer-bias fuzz test already samples every stage; it will pick up new items automatically once banks are tagged.

## Stage labels
Small per-zone label maps for practice/boss titles where "3rd grade" wording would lie at other grades (e.g. Graph Basics/Graph Detective → per-grade names). Copy-only, lives next to each zone file.

## Verification
- Unit: migration fills grade 4; `effectiveConfig` per grade × kind; every bank has ≥ N items per level for every zone that filters by it (anti-starvation); existing content-invariants + answer-bias fuzz run all 3 grades.
- Manual: fresh profile flow forces the grade choice; grown-up edit; `/parent` shows current grade; G2 profile never sees 7×8, G4 never sees "how many sides does a triangle have".
- Full gate: `npx tsc -b`, lint, vitest (Node 26 needs `NODE_OPTIONS="--localstorage-file=/tmp/sq-ls.json"`), `npm run build`, `build:single`.

## Phases
1. **Engine** (this PR series): store + migration + picker + parent edit + `gradeTiers.ts` + `effectiveConfig` wiring + provider level filters (G3/G4 banks as-is so behavior is unchanged until content lands) + tests. ✅ DONE
2. **Content**: author the grade-2 (and L4 enrichment) banks + passages + labels; TTS regen if needed.
3. **Polish**: zone descriptions, README/roadmap, map-screen copy.

## As built (engine notes)
- **Bank levels are a per-stage-index ramp**, not one flat level: `Tier.bankLevels = [concept, practice, mastery]` (G2 `[2,2,3]`, G3 `[3,3,4]`, G4 `[3,4,4]`), so the zone's within-ladder ramp survives. `GameRunner`/`DailyChallenge` pass the stage index into `effectiveConfig`.
- **Level fallback**: `pickLevel(requested, availableLevels)` — nearest stocked level, easier first. Lets the engine ship before any grade-2 bank content exists: today a G2 profile sees the level-3 bank in static zones (verified in the browser) and the correctly-tiered math everywhere else. Authoring a level-2 bank immediately redirects it.
- Migration runs in zustand `merge` (not `migrate`): any persisted player without a valid numeric grade → `grade: 4`. Persist `version` bumped to 2; storage key unchanged so existing progress loads.
- Place-value rounding config widened with `100000`; `dataGraph.CHARTS` exported for the coverage test.
- Extra G2 content already in this PR: parametric add/subtract word-problem templates (single-step, within ~60) via the new `'addSubtract'` wordProblem topic.
- Live-verified: fresh-profile grade picker is required; G2 profile serves 2×5 arrays and take-away word problems; grade flipped to 4 on a saved profile re-tiers multiplication (7×6 served); locked-stage ladder unchanged.

## Out of scope (parked)
- Tier promotion/advancement ("beat G3 boss → unlock G4 content") — future, keys off the same field.
- Per-zone per-grade unlock gating (today's star-unlock ladder is untouched).
- Adaptive difficulty interplay: existing per-fact adaptive weighting keeps working *inside* the tier unchanged.
