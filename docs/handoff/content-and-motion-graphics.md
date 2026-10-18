# Handoff: deeper question banks and lesson motion graphics

For a local agent (Hermes on oMLX, or any model) working in this repo, written 2026-10-18.
This page has two jobs:

- **Part A:** grow SummerQuest's question banks where kids will run out of content first.
- **Part B:** build new lesson motion-graphics scenes that stay smooth on Fire tablets.

Read the **Ground rules** first, then pick a task from the priority list in A1.

---

## Ground rules (both parts)

1. **Work on a branch.** Start from `claude/sweet-ptolemy-96x364`, or from `master` once PR #7 is merged.
   - Name it `content/<bank>-<short>` or `motion/<lesson>-<step>`.
   - Commit small batches, one bank or one scene per commit.
2. **Every commit must pass:** `npm test`, `npm run lint`, `npx tsc -b` and `npm run build:store`.
   - The store build fails on any network use: that's a kid-safety gate, not a nuisance.
   - Never weaken a test to make content pass. Fix the content.
3. **Everything is static and offline.** No fetching, no APIs, no AI at runtime. Content is TypeScript data in the repo.
4. **Don't touch lesson narration text** (`narration` in `src/tutoring/lessons/*.ts`) unless your task is a new lesson step. Narration has recorded audio; see B6.
5. **Write original content.** Never copy passages, questions or art from books, websites or tests. Retell facts in your own words.
6. **Kid safety** (ages 7–9, a child-directed listing):
   - Wholesome and gentle. Nothing scary, sad, gross or violent; no weapons, real-world conflict, religion, politics, brands or products.
   - No real living people. Historical figures are OK only when the fact is the point (the Wright brothers' first flight).
   - Characters get everyday first names from many backgrounds (Maya, Diego, Sam, Lily, Owen, Aisha, Kenji, Priya…). No last names, no addresses.
7. **When unsure about a fact, leave it out.** A wrong fact in a kids' learning app is worse than a missing item.

---

# Part A: Question banks

## A1. Where content is needed most

A child plays daily for about 8 summer weeks. The fixed banks have no "already seen" memory between sessions: each session deals a fresh shuffle. So a bank of N items starts repeating after about √N sessions' worth of draws. Ranked by how soon kids hit repeats:

| # | Bank (file) | Today | Target | Why it's first |
|---|---|---|---|---|
| 1 | **Writing prompts** (`src/lib/providers/writingPrompt.ts`, `STATIC_PROMPTS`) | 12 sentence, 12 paragraph, 12 story, **same for all grades** | **40+ per kind**, split by grade band | A repeat is expected by about the 3rd session, and a 7-year-old and a 9-year-old get identical prompts. Easiest to write: prompts only, no answer key. |
| 2 | **Reading passages, level 2** (`content/grade2.ts`, `G2_READING`) | 8 passages / 24 questions | **25+ passages** | Two G2 stages share this one pool, so the same passage is back within 1–2 sessions. |
| 3 | **Reading passages, levels 3 and 4** (`readingComprehension.ts`, `PASSAGES`) | L3: 9, L4: 9 | **25+ each** | L4 is shared by two stages for G4. |
| 4 | **Science passages, L2 / L3 / L4** (`content/grade2.ts` `G2_SCIENCE`, `science.ts` `PASSAGES`) | 7 / 9 / 9 | **20+ each** | Two stages share a level for every grade. |
| 5 | **Data graphs** (`dataGraph.ts` `CHARTS`, `content/grade2.ts` `G2_CHARTS`) | L2: 10, L3: 14, L4: 17; one question per chart | **30+ per level**, and 2–3 questions per chart | G2 sees the same chart *and* question again. |
| 6 | **Cloud Keeper situations** (`scienceCycle.ts`, `CYCLE_SITUATIONS`) | 18, all grades | **40+** | A 3D game whose prompts recycle fast. |
| 7 | **Geometry** (`geometry.ts` `QUESTIONS`, `content/grade2.ts` `G2_GEOMETRY`) | L2: 18, L3: 25, L4: 30 | **40+ per level** | G4 shares L4 across two stages. |
| 8 | **Fraction equivalence, grade 2**: a generator, but only **8 distinct problems** at G2 | 8 | 20+ | It is also the Daily Challenge pool. A generator change: see A4. |
| 9 | **Times Grove planting orders** (`multiplicationGrove.ts`, `GROVE_ORDERS`) | 15 at G2 (factors ≤5) | 30+ at G2 | 3D game prompts. |
| 10 | **Word-problem story skeletons** (`wordProblem.ts`) | 8 add, 8 subtract, 12 multiply, 12 divide | Double each | The numbers vary, but kids recognise "Maya picked seashells…". |

Don't add content to banks that are already generators with thousands of variants: place value, fraction compare, mixed measurement, multiplication and division at G3/G4.

## A2. Item shapes (exactly what to write)

Questions become `Problem` objects (`src/lib/problem.ts`). You don't write those directly: write the bank's own item shape below, and the provider builds the `Problem`.

**Reading and science passages** (the `Passage` / `ReadingItem` shape):
```ts
{
  title: 'The Busy Beaver Pond',
  level: 2,                       // 2, 3 or 4 (the grade band it's written for)
  text: `…60–110 words (L2), 70–90 (L3), 85–110 (L4)…`,
  questions: [                    // exactly 3, of different types
    { question: 'Where did …?', answer: 'by the river',
      options: ['by the river', 'in the forest', 'on a hill', 'at the beach'],
      type: 'detail' },           // 'detail' | 'main-idea' | 'inference' | 'vocab'
    …
  ],
}
```
- `answer` must be one of `options`, character for character.
- Level 2 goes in `content/grade2.ts`. Levels 3 and 4 go in the provider file's `PASSAGES`, or `content/l4Enrich.ts` for L4 enrichment.

**Geometry:** `{ level, question, answer, options, hint? }`

**Data graph:** `{ level, title, unit?, bars: [{ label, value, emoji? }], question, answer, options, hint? }`
- G2: at most 4 bars. Values are positive integers. Labels are unique and spelled out.
- Questions must be solvable by the test's solver: most / fewest / how many / how many more / how many fewer / together / in total / average (whole-number averages only) / "each bar unit is N".
- No ties when asking for the most or the fewest.

**Writing prompt:** a single sentence or two, ending in a clear task.
- "Write two sentences about a time you helped a friend. Tell what you did first and what happened next."
- Today `STATIC_PROMPTS` is `{ sentence, paragraph, story }`. To make prompts grade-specific, add a `byGrade` map *next to it* and fall back to the shared list. Keep the existing API so stages don't change; see A4.

**Cloud Keeper situation:** `{ prompt, answer: <process>, short }`. The process is one of the existing water-cycle processes in that file. Copy an existing item's style.

**Grove order:** `{ rows, cols, prompt }`. Factors stay within each grade's cap (G2 ≤5, G3 ≤6, G4 ≤7). The prompt names an array the child plants.

## A3. Curation rules (the quality bar)

**Grade fit.** Write to the standard named in the comment block at the top of `content/grade2.ts`:
- G2: CCSS 2.OA / 2.NBT / 2.MD / 2.G; RL.2.1–2.4; NGSS 2-PS1, 2-LS2, 2-LS4, 2-ESS2.
- G3 and G4: their grade's CCSS / NGSS equivalents.
- Do **not** add items above a grade's standard. The owner already flagged these: perimeter, elapsed time and change at G2; fifths and tenths in G3 equivalence; averages and angle sums in G4. Add a comment naming the standard above each item or group.

**Reading level.**
- L2: short sentences of about 8–12 words, common words, at most one new word per passage (and that is the `vocab` question).
- L3/L4: longer sentences, some descriptive language, one inference question.
- Every passage has a clear beginning, middle and end, or for science a clear main idea.

**Answers and options.**
- The answer must be stated in the passage (`detail`) or follow from it unambiguously (`inference`). Never reward outside knowledge.
- 3–4 options. All plausible, all the same grammatical form, no "all of the above" or joke options.
- **Vary option lengths on purpose.** `answerBias.test.ts` fails a bank if the right answer is the strictly longest option in more than 30% of items, or the strictly shortest in more than 35%.
- No negative numbers. Numbers use US grouping: `12,345`.

**Kid-facing copy** (from the proofreading passes):
- US spelling ("gray", "color"), the serial comma, consistent tense.
- Spell labels out ("Chocolate", not "Choc"). An emoji must match its label.
- Facts are exact: a square has four *square* corners; a roof is a triangle.
- No standards codes, "level", "AI" or developer words in anything a child sees.
- Encouraging, never shaming.

**Variety.** Rotate settings (home, school, park, farm, beach, city, desert, space, the ocean), seasons, animals and character names. In any batch of 10, no name or setting appears more than twice.

**What tests check automatically** (`src/lib/providers/__tests__/contentFuzz.test.ts`, `answerBias.test.ts`, `contentInvariants.test.ts`, `gradeTiers.test.ts`):
- clean text (no double spaces, `undefined`, repeated words, or a space before punctuation);
- 2–6 unique options with the answer appearing exactly once;
- graphs solvable and tie-free;
- passage questions consistent;
- every grade has a non-empty pool.

The tests can't check that a fact is true, a passage is engaging, or a question is fair: that's your job (A5).

## A4. Small code changes some tasks need

Keep each one a separate, tested commit.

- **Grade-specific writing prompts:** add `byGrade?: Partial<Record<2 | 3 | 4, …>>` beside `STATIC_PROMPTS`. The provider picks the child's grade list if present, else the shared list. Add a test that every grade gets at least 30 prompts per kind.
- **More questions per chart:** change a `DataChart` to carry `questions: [...]` (keeping `question` working), and have the provider deal (chart, question) pairs. Update the solver test to cover every question.
- **G2 fraction equivalence variety:** widen the G2 generator only within 2.G.A.3 (halves, thirds, fourths), for example by varying the multiplier and which side is unknown. Keep the fuzz suite green.

## A5. Workflow for a batch

1. Pick one bank and one level. Read 3 existing items to match the style.
2. Write 5–10 new items in the bank file (never more per commit).
3. Self-review each item against A3. Read the passage, then answer every question *only* from the passage. If any question needs outside knowledge or has two defensible answers, rewrite it.
4. Run `npx vitest run src/lib/providers` and fix any failures, then `npm test`.
5. Commit: `Content: +N <bank> L<level> (<theme words>)`.
6. Every 30 items, list the batch's names, settings and topics and check the variety rule.

---

# Part B: Lesson motion graphics

## B1. How the lesson stage works

- **A lesson** (`src/tutoring/lessons/<lesson>.ts`) is `{ id, title, steps: LessonStep[] … }`.
  - Each step is `{ id, narration, body?, check? }`.
  - `narration` is the spoken script, with recorded audio and word timings.
- **A scene** is a pure function of time:
  ```ts
  type Scene = (p: { t: number; dur: number; cue: (phrase: string, nth?: number) => number; reduced: boolean }) => ReactElement
  ```
  - It draws an SVG stage 960×540 (`W`, `H` in `motion/palette.ts`) at time `t` seconds.
  - `cue('some phrase')` returns the second at which that phrase is spoken in this step's narration. Time everything off cues, never hard-coded seconds, so pictures stay in sync with the voice.
  - `reduced` is the reduced-motion setting: render the final, still state.
- **Registering a scene:** each `motion/scenes/<lesson>.tsx` exports `{ [stepId]: Scene }`, which is added to `SCENES` in `motion/scenes/index.ts`.
- **Building blocks:**
  - `motion/kit.tsx`: Paper, Pop, Fade, Move, Draw, Title, Kinetic, Words, Count, Equation, Chip, Badge, Arrow, Hop, Brace, NumberLine, Flip, Highlight, Ring, Burst, Confetti, Twinkle, Glow, Camera, and `T` (a transform group).
  - `motion/shapes.tsx`: cookies, apples, place-value blocks and more.
  - `_b2kit` / `_b3kit` / `_b3art`: geometry helpers, text layout, characters.
  - `motion/anim.ts`: easing helpers (`progress`, `ease.*`, `spring`, `interpolate`, `rand(i)`, which is deterministic).
- **Start by reading** `scenes/division.tsx` (`share`), a small, clean, fully cue-timed example.

## B2. Performance rules

These rules come from measurements on a real Fire HD 10. Playing lessons were the slowest screens in the app, around 34–38 fps, because the vector stage is re-rendered and re-rasterized every frame. The current fixes already cut repainting about in half: 30 fps on tablets, no filters, and a frozen stage after the narration ends. Each rule removes a measured cost. **Breaking them makes lessons stutter on the tablets kids use.**

1. **Use `<Paper />` for the background, once. Never add another full-stage background, pattern, vignette or big translucent panel.** Whatever sits under a moving shape is repainted with it every frame, and patterns and gradients are the costliest things to repaint.
2. **No SVG filters.** No `filter=`, `feGaussianBlur`, `feDropShadow` or `url(#sq-shadow)` / `url(#sq-glow)` in new scenes.
   - For a glow, use `<Glow>` (a radial-gradient disc).
   - For a shadow, draw a darker offset shape or an ink outline (the toon look).
   - Tablets switch filters off anyway (`.sq-stage [filter]` in `src/index.css`), so a filter-based look won't even show.
3. **Motion must end.** Every animation is bounded by cues: it starts at a cue and settles within about 1–2 s.
   - No endless `Math.sin(t * …)` bobbing, spinning, scrolling dashes (`strokeDashoffset={-t * 40}`) or always-on twinkles.
   - If something should feel alive while a phrase is spoken, wrap it in a window: `between(t, cue('a'), cue('b'))` and ramp it to zero at the edges.
   - Tablets freeze the stage 1.5 s after the narration ends, so endless motion is wasted work while the voice plays. Desktop keeps running whatever you leave on.
4. **Element budget: at most about 150 SVG elements on screen at once**, and under about 250 at the peak of a transition.
   - The heaviest current scenes (wordProblem/plan, wordProblem/read, science/states) peak at 315–360 and are the slowest.
   - Don't render things that are off-stage or fully faded: return `null` before `at` and after `out`, as `Pop` and `Fade` do.
5. **Move things with transforms, not new geometry.**
   - Prefer `<T x y s r o>` or `transform=` on a group over regenerating path `d` strings every frame.
   - `Draw` (stroke reveal) is fine.
   - Avoid long dynamic paths with hundreds of points.
6. **The camera moves only at cue keys.** `<Camera keys=[…]>` is fine: it eases for 0.9 s before each key and then holds. Don't feed it a continuously changing key, which drifts and repaints the whole stage every frame.
7. **Text: few, large words.**
   - Use `Title` / `Words` / `Kinetic` at size ≥ 36 (stage units).
   - At most about 12 words visible at once. The caption beside the stage carries the full sentence.
   - Outlined text (`stroke`) is OK for headings, not for every label.
8. **Deterministic only.** No `Math.random()`, `Date.now()`, `performance.now()` or CSS animations: use `rand(i)` and `t`. Scenes must look identical at the same `t` on every run (the tests render them).
9. **No new `<defs>` per frame.** Gradients and patterns are defined once: reuse `Defs`, or a single per-colour def as `Glow` does. Never put `t` in an `id`.
10. **Respect `reduced`.** When `reduced` is true, render the finished picture with no motion.

## B3. Making a scene

1. Read the step's `narration` and pick 3–6 **cue phrases**: exact substrings of the narration, in the order they're spoken.
2. Sketch the **final frame first**: what does the child see when the voice stops? Then the beats: each cue adds or changes one thing.
3. Write the scene in `motion/scenes/<lesson>.tsx` using kit pieces, then register it.
4. Add a colour-code comment at the top of the file if the lesson uses one (e.g. "groups = blue, each = coral"), and keep it consistent across the lesson's steps.
5. Run the scene tests: `npx vitest run src/tutoring`.
   - `motion/__tests__/scenes.test.ts` checks that every step has a scene, every `cue()` phrase is in its narration, and the scene renders at t = 0, 3, 8, 15 and 10000 without throwing.
6. Look at it:
   - Run `npm run dev`, open `/tutor/<lessonId>`, tap Watch, and watch it all the way through.
   - Check the end frame: everything readable, nothing overlapping, nothing half-faded.
7. Check the performance rules (B2) line by line before committing.

## B4. Visual style

- Palette: `M` (paper, ink, coral, gold, mint, sea, lilac, pink, sand, wood) and `DEEP` for text. Draw ink outlines about 3–5 px.
- Flat toon shapes with ink outlines, matching the 3D World's toon look. No gradients except `Glow`.
- Keep a 40-unit margin from the stage edge, and a hero object filling 30–60% of the stage.
- One idea per step: the picture explains the sentence being spoken, nothing more.
- Leave the end frame on screen and readable. The child may stay on it for a while (reading, answering the check).

## B5. Using the Hermes `motion-graphics-guide` skill

`~/.hermes/skills/creative/motion-graphics-guide` (the same as `~/.claude/skills/motion-graphics-guide`) is written for standalone GSAP/three.js HTML pieces rendered to 1920×1080 60 fps mp4. **It does not target this app.** Use its *process* (two ideas, final frame first, beats, self-review of frames), but **these rules override it**:

| The skill says | In SummerQuest |
|---|---|
| `new_piece.sh` scaffolds `index.html` with GSAP and three.js | Write a `Scene` function in `src/tutoring/motion/scenes/<lesson>.tsx`. No GSAP, no three.js, no new dependencies. |
| A pure function of the *frame number* | A pure function of `t` (seconds), timed by `cue()` phrases |
| 1920×1080 frame, text ≥ 36 px | 960×540 stage units, text ≥ 36 units |
| "Something is always alive" | **Motion must end** (B2.3). Still is fine; tablets freeze the stage after narration anyway. |
| Glows, blurs, depth effects | **No filters** (B2.2); Glow gradient only |
| Render to mp4 with `render_mp4.mjs` | No rendering. It plays live in the app. To review, use `npm run dev` and screenshots. |

## B6. If you write a new lesson step

The narration needs recorded audio. After adding or changing any `narration` text:
1. Run `npm run tts:dump`.
2. Render the clips: `npm run tts:local`. It uses the local Qwen3-TTS voice `qwen3-tts-1.7b:clone:calm-teacher-v1` and needs the owner's TTS setup.
3. Run `npm run tts:check`, which must report every clip fresh.
4. Run `npx vitest run src/tutoring`; the narration-sync test must pass.

If you can't render audio, **don't change narration**: write scenes for existing steps only, and list the narration you'd propose in your PR description.

---

## Acceptance checklist (paste into the PR)

- [ ] Branch from the current base; small commits.
- [ ] `npm test`, `npm run lint`, `npx tsc -b`, `npm run build:store` all pass.
- [ ] Content: every item self-reviewed against A3 (fact-checked, answerable from the text, grade standard named, options of varied length).
- [ ] Content: variety rule met (names, settings, topics).
- [ ] Scenes: no filters, motion ends, at most about 150 elements, `<Paper />` background, deterministic, `reduced` handled.
- [ ] Scenes: watched end to end on `npm run dev`; end frame readable.
- [ ] No narration changed, or the audio was re-rendered and `tts:check` is clean.
