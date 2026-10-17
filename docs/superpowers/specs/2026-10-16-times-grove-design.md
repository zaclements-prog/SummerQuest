# Times Grove — array orchard (design)

**Status:** in build (vertical slice) · 2026-10-16 · zone: Multiplication Mesa
**Research basis:** validated renamed (previously Times Grove skip-count
number-line hop — INVALIDATED by the NLE-transfer literature, see note below).
Arrays/area models for equal groups: Downton & Sullivan 2017 (27%
multiplicative-strategy frequency vs 4% superficial); Jitendra et al. 2022/2023
+ 2025 Tier-2 (arrays/area → multiplicative thinking, n=86); Park & Brannon
2013 (approximate arithmetic on dot arrays transfers selectively to symbolic
arithmetic). NLE transfer negative controls: Wei et al. 2023 (NLE training
improves NLE, not arithmetic), Nuraydin et al. 2022 RCT; ANS acuity training:
Kim et al. 2018 (no transfer).

## Goal

Fourth intrinsic-integration game (Crystal Golems ÷, Fraction Forge, Cloud
Keeper): **the array IS the mechanic**. The keeper's chalk board posts a
planting order ("3 rows of 4"); three plots stand pre-grown. The kid walks to
the plot that already grows that many trees — reading rows × per-row,
counting in groups, not reciting a line.

## Mechanic

The HUD speaks the planting order (e.g. "Plant 3 rows with 4 trees in each
row. Which plot already grows that?"). The three plots ARE the answer choices
(option totals are the plot chalk numerals). Walking onto a plot's ring and
-through- its rows performs the count: each row crossed chants one group ("1
four… 2 fours… 3 fours") and the plot's card shows its total.

- Candidates per round share structure on purpose: target 3×4 against 3×5
  (same rows, one wider) and 4×4 (one deeper) — you must attend to BOTH
  dimensions; perfect pitch between "3 rows of" and "4 in each row".
- Correct → the walked rows bloom, gold flash, HUD chants the grouping and
  speaks `GROVE_WIN_LINE`; on a rows≠cols plot the commutativity beat names
  the rotated twin ("and 4 rows of 3 plants the same 12 trees!").
- Wrong → the plot performs its count and the trees STALL (they sink back —
  no such order was planted), mini-lesson on the walked plot's shape, try
  again.
- Rounds: 5 (`params.rounds`).
- **Re-arm gate:** same as Cloud Keeper — after any resolve the kid is still
  standing in the resolved ring; all rings stay inert until the kid steps
  clear of every ring once.

## Content

Curated bank in `src/lib/providers/multiplicationGrove.ts`: hand-written
planting orders across factor pairs 2–6 (include the 3×4/4×3 pair the
literature loves). Invariants (tested):

- target shape = the prompt's "a rows of b"; never the product digit in the
  prompt
- the three candidate totals in a round are all distinct, each maps to an
  integer grid shape (`GROVE_SHAPES[total]` exists — no orphan options)
- prompts unique and substantial; factId absent (curated fixed bank, not
  sampler-backed)

## Scene (planned constants — the Cloud Keeper rig)

- CloudKeeper skeleton: phases, walk-to-ring, re-arm gate, HUD carrying all
  text, chalk-on-card numerals
- PLOT shapes are those built at runtime: `IVOA`,`BOXES` always loaded —
  three GroundRing-padded plots of tree instancing rows (`GrovePlot.tsx`)
- win ritual state `{mood}` — `applyGroupState` drives per-row bloom while
  chunks of the chant land; correct walk → rows pop green; wrong → sink
- dev hook `window.__sqGrove = { state(), walk(x,z), pos() }` for QA

## Wiring

- `GameId` += `'timesGrove'`; GameRunner case
- new `ProviderConfig` variant `{ kind: 'multiplicationGrove' }` +
  registration; `effectiveConfig` case returns config unchanged
- Multiplication Mesa: `mult-concept` gameId `conceptPlay` → `timesGrove`
  (stage 0 — no bankLevels reindex needed; effectiveConfig returns config
  unchanged for every grade)
- skills: providers emit explicit skill ids (`mult-f2_5` / `mult-f6_9` by
  factor); `deriveSkillId` prefix-maps topic `multiplication-grove` →
  `multiplication` — no SKILLS edit needed

## Acceptance gate

1. `npx tsc -b` · `npm run lint` · `npm test` (core + bank tests green) ·
   `npm run build`
2. live: boot (board + three plots + rings), wrong plot → count + stall +
   teach, correct → row-by-row chant + bloom, 5 rounds → results
3. no console errors; commit + tag `times-grove-validated-2026-10-16` + push
   mirror

## Non-goals (slice)

- no free-build mode (dragging individual trees per group) — walking a
  pre-formed array keeps the mechanic single-verb
- no skip-count number-line hop as shipped earlier — invalidated for
  arithmetic transfer (Wei 2023, Nuraydin 2022); arrays only
- no LLM content source (curated bank only)
