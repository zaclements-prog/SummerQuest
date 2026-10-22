# SummerQuest: project status

_Last updated 2026-10-22 (5th grade merged) on branch `claude/sweet-ptolemy-96x364` (draft PR #17)._

This page says what is built, what is in flight, and what is left. Design and
contracts are in [`docs/superpowers/specs/2026-10-19-k5-expansion-plan.md`](superpowers/specs/2026-10-19-k5-expansion-plan.md).
Rendering the voice is in [`docs/narration-handoff.md`](narration-handoff.md).

## Grades at a glance

| Grade | Band | Mode | State | Shipped in the store build? |
|---|---|---|---|---|
| K | `k1` | voice-first (`listen`) | **Complete:** 12 zones, 13 lessons | No (behind `VITE_K1`) |
| 1 | `g1` | voice-first (`listen`) | **Complete:** 12 zones, 11 lessons | No (behind `VITE_K1`) |
| 2–4 | `g24` | read + hear | Complete (the original game) | **Yes** |
| 5 | `g5` | own | **Complete:** 12 zones, 11 lessons, 4 game tiers | No (behind `VITE_G5`) |

- **Dev builds** (`npm run dev`) show every grade.
- **The store build** (`npm run build:store`) offers only grades 2–4. Its check proves the bundle makes no network calls.
- A zone's stage set for a grade is `zoneStages(zone, grade)` (`src/curriculum/index.ts`), with these fallbacks (`bandFallbacks`, `src/lib/gradeBand.ts`):
  - **1st grade:** its own set, else kindergarten's.
  - **5th grade:** its own set, else 2–4's.
- Lessons follow the same rule, per zone (`lessonsFor`, `src/tutoring/lessons/index.ts`).

## Zones by grade

| Zone id | Kindergarten | 1st grade | 2nd–4th grade | 5th grade (contract) |
|---|---|---|---|---|
| `multiplication-mesa` | Counting Mesa | Adding Mesa | Multiplication Mesa | Multi-digit multiplication, Times Grove area models |
| `division-dunes` | Number Dunes | Take-Away Dunes | Division Dunes | Long division, Division Arena two-digit divisors |
| `fraction-falls` | Add-and-Take Falls | Fair Share Falls | Fraction Falls | Unlike denominators, Fraction Forge tier |
| `place-value-plateau` | Ten Frame Plateau | Tens Plateau | Place Value Plateau | Decimals to thousandths |
| `measurement-marsh` | Measure Marsh | Measure Marsh | Measurement Marsh | Volume, unit conversion |
| `geometry-grove` | Shape Grove | Shape Grove | Geometry Grove | Coordinate plane, figure hierarchy |
| `data-delta` | Sorting Delta | Graph Delta | Data Delta | Line plots with fractions |
| `word-problem-woods` | Story Woods | Story Woods | Word Problem Woods | Expressions, order of operations |
| `reading-reef` | Letter Reef | Word Reef | Reading Reef | Level-5 passages |
| `writing-workshop` | Writing Workshop | Writing Workshop | Writing Workshop | Opinion, informative, narrative |
| `science-summit` | Nature Summit | Sky Summit | Science Summit | Matter, ecosystems, Earth's spheres, Cloud Keeper tier |
| `tower-battlefront` | Counting Towers | Counting Towers | Tower Battlefront | Fraction and decimal gates |

Stage ids and lesson ids for every zone and band are fixed in the expansion plan's contract sections.

## How kindergarten and 1st grade play

- **No reading needed.** Every question is spoken and answered by tapping pictures, or through a hands-on activity (Listen & Play, `src/games/listenPlay/`).
- **Activities** (`src/games/listenPlay/activities/index.ts`):
  - drum, trace, order, mathStory;
  - matchRows, compareNumbers, numberOrder, teenFrames, buildTeen;
  - measure, sort, readAlong, tiles;
  - tens, buildTens, shareTap, snap;
  - lengthOrder, units, clockMatch, graph, numberSentence.
- **Navigation is guided by voice:** a spotlight Guide, spoken zone and stage names, and picture stage buttons.
- **Games** have K–1 modes:
  - Critter Parade: K counting gates; 1st-grade +/− gates within 20.
  - Tower defense (`params.listen`).
  - The 2–4 games are unchanged, which golden-trace and fingerprint tests prove.
- **Lessons** are short voice lessons with motion scenes and spoken picture checks. Each hatches the zone's pet.

## Verification (latest)

- **CI:** green on `76f51b0`, the merge of all of 1st grade.
- **Locally:** `tsc -b`, lint, about 2,300 tests and `build:store` all pass.
- **Playthrough bots:** these Playwright scripts play every K and 1st-grade stage, lesson and zone page to the end, at 1024×528 and 600×952.

  | Grade | Checks passed (at both sizes) |
  |---|---|
  | Kindergarten | 4 bots, all pass; the only failures are checks for zones that are still asleep, which no longer exist |
  | 1st grade | 51/51, 60/60, 41/41 and 62/62 |

## How 5th grade plays

5th grade uses the 2nd–4th grade screens and games, with its own providers, lessons and pictures:

- **Its own stage set in every zone.** Each set has a concept stage, a practice stage, a mastery boss, and the zone's 3D game where it has one.
- **Every zone has its own 5th-grade subtitle and description**, read through `zoneSubtitle` and `zoneDescription`.
- **Providers:** `g5Mult`, `g5Div`, `g5Expr`, `g5Fractions`, `g5Decimals`, `g5Gates`, `g5Measure`, `g5Geometry`, `g5Data`, `g5Reading`, `g5Writing`, `g5Science` and `g5Spheres`.
  - The math providers generate questions procedurally, with exact answers and wrong choices built from real mistakes.
  - Reading uses a bank of 24 original passages; science uses 16 passages plus generated items.
- **Game tiers.** Each is chosen by the stage's params; the 2nd–4th grade versions are unchanged, which isolation tests prove.

  | Game | 5th-grade tier |
  |---|---|
  | Times Grove | Area models: plant each partial product, then the total |
  | Division Arena | Two-digit divisors |
  | Fraction Forge | Unlike denominators: pick the common slab size |
  | Cloud Keeper | Earth's four spheres |
  | Tower Battlefront | Fraction and decimal gates |
- **New pictures:** `areaModel`, `longDivision`, `fractionArea`, `prism`, `coordPlane` and `linePlot`.
- **Writing Workshop** grades against a 5th-grade checklist offline (`src/lib/g5WritingGrader.ts`).

## Open items

1. **Voice rendering (local Mac):**
   - 97 K/1st-grade lesson steps;
   - 7,330 voice-line clips;
   - 56 5th-grade lesson steps (11 lessons).

   See the narration handoff, section 0. Until clips exist, the app uses the device's speech.
2. **Listening pass** after rendering: phonics sounds, stitched number sentences, and "minus" vs "−". This is also the plan's phonics decision (owner decision 4): keep the Higgs sounds or record the 44 sounds.
3. **Fire tablet check:** Parent area → Voice check, on a real device, to confirm the device-speech fallback works in the Amazon WebView.
4. **Thin spots:**
   - 1st-grade Sky Summit has only 16 questions.
   - The Critter Parade results card shows a few English labels (e.g. "Smart picks") to 1st graders.
5. **Store update** (plan phase 4): turn on `VITE_K1`/`VITE_G5` for release, a new title and screenshots, a rating re-check for 5-year-olds, and a privacy-policy line about the device voice.
