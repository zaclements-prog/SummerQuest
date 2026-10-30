# New games: trending mobile loops with the math inside

Date: 2026-10-19. Status: plan for owner review.
- **Research:** `docs/research/2026-10-19-trending-games-research.md` (landscape, education precedents, 10 concepts, guardrails, sources).
- **Companion:** `2026-10-19-k5-expansion-plan.md`.

## What the research says, in five lines

1. **The crowd-runner gate is the best fit for K–5 math on the market.** Choosing "+5 or ×2?" *is* an arithmetic comparison, and the growing crowd is the answer you can see. Mob Control and Count Masters are huge. The 4X games even sell themselves with fake gate ads.
2. **The classroom hits put the math in a toll booth.** In Blooket, Gimkit, Prodigy and Kahoot you answer a quiz to earn game power, so kids rush the math to get back to playing. Our Tower Battlefront `MathGate` works the same way.
3. **Integrating the math into the game wins.** In Zombie Division, the math was *in* the action. It beat the same game with quiz gates on learning, and kids chose to play it about 7× longer. A replication kept the learning gain and traced it to attention: you look at the math because you act on it.
4. **Feedback that explains is the active ingredient**, as in the fraction number-line studies. A rule follows: reward smart choices and effort, never speed.
5. **The genre's dark patterns are exactly what to avoid:**
   - fail-by-one level tuning;
   - FOMO timers;
   - loot boxes and gacha;
   - streak guilt;
   - energy meters.

   Regulators (FTC, the UK children's code, PEGI) are moving against them, and our child-directed listing rules them out anyway.

## The design rules every new game follows

1. **The math is the move.** The decision you make to play *is* the problem. No quiz pops up between you and the game.
2. **The best choice depends on the state.** Gate values are chosen against your current count, so "×2 always wins" fails. The pool includes ties and traps built from common misconceptions:
   - ⅓ vs ¼;
   - 0.25 vs 0.5;
   - "×½ means halve".
3. **Commit, then reveal.** No preview of the result. Sides and colors are randomized.
4. **A wrong choice is visibly worse, never a disaster.**
   - You still gain the smaller amount.
   - A see-through "ghost" replays what the other choice would have done. That replay *is* the feedback.
   - Nobody fails out.
5. **Time by age:**
   - **K–1:** no clock; the world pauses while the voice asks.
   - **2–3:** at least about 5 s between decisions, plus a few "slow-mo" taps.
   - **4–5:** a speed mode, only as an option after mastery.
6. **Scaffold, don't punish.** If a child's picks sit near chance (≤ 55% over 10 decisions), the game slows down and adds pictures (dots, ten-frames, bars).
7. **Stars count smart picks,** not speed or luck.
8. **No dark patterns:**
   - no random rewards, energy, expiring events or "come back tomorrow";
   - no fake "so close!";
   - rounds end on a natural stopping point and never auto-start the next one.
9. **Voice-ready.** Every prompt is a voice line or template (see the K–5 plan, §3). K–1 can play with no reading.
10. **Fire-tablet budget:**
    - one instanced mesh per species, animated in the vertex shader;
    - about 150 visible bodies at most, with the true count shown as a big number;
    - under about 100 draw calls;
    - `StaticBatch` for scenery, `GLCanvas`, and no per-frame allocations.

## Shared foundation: the Number Model and the Gate engine

Several games ask the same question: "which of these values is better right now?" Build that once.

- **`lib/numbers/`: exact values.**
  - Integers, fractions and decimals are stored as exact rationals, so comparisons are exact (no floating-point surprises with 0.1 + 0.2).
  - Each value comes with renderers: dots, ten-frame, numeral, expression, fraction bar or circle, decimal.
  - Each value also carries its speech: a voice template plus slots.
- **`lib/gates/`: a pure, tested generator.** Given the current state (the count), the band and an operation set, it produces a pair of gate choices.
  - **Operation sets:** add/sub (K–1), ×, ÷, fraction-of, decimal ×.
  - **Guarantees:**
    - a winning side, sometimes a tie;
    - a target gap between the outcomes, which sets the difficulty;
    - whole-number results only (×½ only on even counts, ×0.25 only on multiples of 4);
    - caps on the count;
    - a set share of misconception traps.
  - **Bookkeeping:** it records each decision, keeps the "smart pick" score and runs the chance-level scaffold check.
- **Tests:** property tests over thousands of states per band (results are whole numbers, the declared winner really is better, the traps fire at the set rate, no repeated pairs back to back).

## The games, in build order

### 1. Critter Parade (flagship; the owner's crowd-runner idea, without weapons)

**Hook.** You lead a parade of island critters. Each gate pair adds friends, and the finale is a **tug-of-war against the Grumble Gang**: grumpy fuzzballs who cheer up and join the party when they lose. No one is hurt, and the rope is the drama.
- **The leader** is the child's avatar, their grown-up creature.
- **The followers** are critters, or **baby pets**, which ties the parade into the pets the child is raising (owner decision).

**Loop (60–90 s per level, 3 levels per stage):**
1. **The count you start with** is set by the run's first gate pairs and counting cages.
2. **5–6 gate pairs** follow, plus a cage or two ("2 friends join!") to count on.
3. **The finale:** the parade lines up on the rope against the Gang's number.
   - **K–1:** "Do we have more?" Counting up and comparing.
   - **2+:** "37 against 25: we win by 12!" The difference *is* the margin.

**Controls:**
- **Grades 2–5:** one-thumb drag left and right to pick a gate.
- **K–1:** tap the gate you want. The world pauses while the voice asks "Plus two, or plus five? Which gives us more friends?" No steering skill is needed.

**Gates by band:**

| Band | Example gates (count = 6) | Math |
|---|---|---|
| K–1 | ●● vs ●●●●● dots, spoken "plus two / plus five"; "make 10" gates (+4 at 6) | Counting on, more / fewer, make 10, within 20 |
| 2–3 | "×3" vs "+12" (18 vs 18, a tie: "both work!"); "×2" vs "+5" | Multiplication as groups, comparing expressions, within 100 |
| 4–5 | "×½" vs "−2" (3 vs 4); "×1.5" vs "+4"; "¾ of us invite a friend" | Fractions and decimals as operators, order of magnitude |

**Wrong pick:**
- You still gain the smaller amount.
- The ghost parade shows what the other gate gave ("+5 would have made 11!").
- The count never drops below where the level started.
- A lost tug-of-war shows a hint and offers a rematch, with no fail screen.

**Stars:** smart-pick ratio plus a finale win. 3 stars = mostly smart picks.

**Tech:**
- The track is a recycled corridor of segments (`StaticBatch` per segment).
- Followers are **baked**: each critter species is merged once into a single vertex-colored geometry (the existing batch merger can do this), drawn as one `InstancedMesh` with a waddle in the vertex shader.
- Formation is a sunflower spiral, capped at about 150 shown, with the true count on a big badge.
- The gate number is a canvas texture.
- Everything else is existing kit: `_runkit` HUD, `_juice` pops, `GameCameraRig`, results card.

**Where it lives:** a new `GameId` (`critterParade`) that any zone can use with an operation set:
- Multiplication Mesa: ×;
- Division Dunes: ÷ and −;
- Fraction Falls: fraction operators, and K–1 add;
- Place Value Plateau: ×10 and decimals.

For grades 2–4 it replaces some practice stages that are Speed Run today. Speed Run stays as an optional challenge.

**Risks:**
- **It looks like the ad clones.** Answer with the island art, the critters and the voice.
- **Kids pick by side or color.** Randomized sides and colors, plus the smart-pick scoring, take care of it.
- **Doubling explodes the count.** Cap it, and make operator gates depend on the current count.

### 2. Gobble Garden (a Hole.io-style comparison game)

**Hook.** A hungry garden cloud swallows anything **smaller than its own number** and grows by what it eats. Steer it around a park full of numbered snacks for 90 s, or until the park is tidy.

**Where the math is:** every steering choice is a comparison.

| Band | Snacks show |
|---|---|
| K–1 | dot groups and numerals ("You are 5. Eat things smaller than 5!") |
| 2–3 | expressions (3 + 4, 5 × 2) |
| 4–5 | fractions and decimals (you are 0.7: can you eat ⅝?) |

**Wrong move:** a soft bonk and "too big, burp!" The snack's value flashes, with its picture form.

**Tech:** very cheap: a top-down park, instanced snacks, no physics.

**Zones:**
- Place Value Plateau (compare);
- Fraction Falls (compare fractions);
- Division Dunes (K–1 more / fewer).

### 3. Puddle Patrol (the existing Tower Battlefront, reworked the Zombie Division way)

**Hook.** Numbered Mud Puddings waddle toward the pond. Each sprinkler tower washes **only the Puddings that fit its rule**, so the strategy is *where each tower goes*. Placement replaces today's pop-up quiz.

**Rules by band:**
- **K–1:** the "three-dot tower" washes groups of 3.
- **2–3:** even and odd, then multiples of 2, 5 and 10.
- **4–5:** factors, multiples and primes; towers that wash fractions equal to ½.

**Wrong placement:** the splash bounces off and the Pudding shows its factors. Leaks splash harmlessly into the pond.

**Pacing:** one new tower type per level.

**Tech:** the tower defense engine exists. This mostly changes the rules and the UI.

**As built (2026-10-30).** Code: `src/lib/puddle` (values, rules, stage sets, the seeded wave planner), `src/lib/providers/puddlePatrol.ts`, `src/games/tower-defense/` (pure fixed-timestep `engine.ts`, playtest `bots.ts`, the R3F diorama `PuddlePatrol*.tsx`). One engine for every band; the SVG game, `MathGate`, `KTowers` and `ListenGate` are gone.

- **Placement is the move.** Tap a spot then a card, a card then a spot, or drag a card onto the field. Swapping a standing tower's rule is free; a new tower costs drops (earned one per wash). A wave never needs more rules than the towers you can have.
- **Plan, then send.** Between waves nothing moves; the "incoming" lineup shows the next wave's values (dots for K, number sentences for 1st grade). Each wave leans on one rule (the new one, the wave it arrives), and the lean moves.
- **Teaching.** A spray that doesn't fit bounces off and a bubble says why ("21 is not a multiple of 5: 5 × 4 = 20, 5 × 5 = 25"); K–1 hear the count or the sentence instead. Tap any Pudding for how it fits each rule on offer.
- **No fail state.** Leaks splash into the pond (it clouds a little). Stars come from the pond-clean share, per band (K 75 % / 90 %, 1st 80 / 90, 2–4 80 / 93, 5th 72 / 88), tuned so the matching bot earns 3, a sensible child with slips 2–3, random placement mostly 1.
- **Stages.** K: groups of 2 / 3 / 4, then 5 / more than 5 / fewer than 5, then mixed. 1st: makes 5 / 10 / 7, makes 5 / 3 / 4 (take away), makes 10 / 5 / 15. 2–4: even & odd (`td-even-odd`), multiples of 2, 5, 10 (`td-skip-count`), mixed 10 waves (`td-arena`; 2nd grade's last rule is odd, 3rd–4th's ×3). 5th: factors of 24 and multiples (`g5-td-factors`), primes (`g5-td-primes`), = ½ ¼ ¾ ⅕ (`g5-td-1`). Balance: `node --import tsx scripts/puddle-balance.mjs`.

### Later candidates (from the research's 10)

- **Make-Ten Jam** (sort puzzle): pour number candies until each jar hits its target, with a free undo. Targets: 10 for K–1, 100 for 2–3, 1 whole for 4–5. Very cheap.
- **Merge Sprouts** (merge): ten sprouts make a bush, ten bushes make a tree, and you fill "347" orders. Place value is the merge. Paced by orders, never energy.
- **Number Bridge** (a party race): jump to the platform for 7, ¾ or 0.35 on a wobbly number-line bridge against goofy bots. Number lines are the best-evidenced format in the research.
- **Snack Shack** (arcade tycoon): orders and making change. No offline earnings and no "come back" nudges.
- **Bubble the Grumps** (horde defense) and **Lantern Friends** (survivor draft) skew older or need aiming skill. Park them for now.

## How the new games fit the app

- **Stages, not a separate store.** Each new game is a stage type that zones use, so play counts toward stars, pets and the daily learning goal.
- **The Game Park** (a World spot): replay any game already unlocked in its "free play" mode. It's learning either way, and there's no currency gate.
- **Voice:** every game ships its voice pack (intro, gate prompts, feedback) through the K–5 voice-line system. K–1 versions wait for that system. Grade 2–5 versions don't need to.

## Order of work (it runs alongside the K–5 phases)

| Step | What | Who benefits |
|---|---|---|
| G0 | Number Model and Gate engine (pure, property-tested) | All games |
| G1 | **Critter Parade**, grades 2–4 (× for Mesa, ÷ for Dunes), playable on a Fire tablet | Today's players; it can ship before K–1 is ready |
| G2 | Critter Parade, K–1 version (dots, tap-to-pick, voice) once the voice and guide foundations land | The kindergarten pilot |
| G3 | Gobble Garden, all bands | Compare skills in K–5 |
| G4 | Puddle Patrol, replacing Tower Battlefront's quiz gate | Tower Battlefront for every band |
| G5 | Grade-5 gates (fractions and decimals) across the three games | Grade 5 |
| Later | Make-Ten Jam, Merge Sprouts, Number Bridge | — |

## Owner decisions

1. **Parade finale:** tug-of-war vs the Grumble Gang (recommended); push a giant beach ball uphill; or a marching-band contest.
2. **Parade followers:** generic island critters (simplest), or the child's **baby pets** (ties into raising pets; needs a baked low-poly version of each baby).
3. **Order after the Parade:** Gobble Garden then Puddle Patrol (recommended), or another concept from the list.
4. **Where the new games sit:** replace some Speed Run practice stages (recommended; Speed Run stays as an optional challenge), or add them as extra stages.
5. **The Game Park free play:** yes (recommended) or no.
