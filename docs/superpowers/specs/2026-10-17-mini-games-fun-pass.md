# Mini-games fun pass — review and plan

Date: 2026-10-17 · Games: Crystal Golems (Division Arena), Times Grove, Fraction Forge, Cloud Keeper.

The four 3D games got the *pedagogy* right: each one makes the math the mechanic
(Habgood & Ainsworth intrinsic integration), with honest, physical feedback
(camels split out of a golem, slabs fill a gauge). What they don't have yet is
the *game*. Kids play them once to see what happens and don't ask to play again.

## What's holding them back

1. **The core verb is "walk onto one of three answers".** Every game shows three
   pedestals, trays or plots and the kid walks to one. That is a multiple-choice
   quiz with walking added: the walk is latency, not play. There is nothing to get
   *better* at except the math answer itself.
2. **No tension.** Nothing is at stake within a round. No clock, no threat, no
   "almost!", so success feels flat and failure is just a correction.
3. **Flat pacing.** Five rounds that look and play the same. No warm-up, no
   escalation, no finale, no surprise.
4. **Thin feedback.** A right answer gets a small animation and a chime. There is
   little anticipation (wind-up), impact (shake, burst, hit-stop) or celebration
   (confetti, streak, score count-up), and the host characters don't react.
5. **Nothing to chase.** Stars are the only reward. No score, no streak, no personal
   best, no collectible: no reason to replay a run you already starred.
6. **Presentation lags the World.** A small sand disc floating in an empty pale-blue
   void, far from the toon island the kid just walked out of. Text-heavy prompts
   for 7-year-olds. (Also: a fresh profile shows the avatar as a purple
   placeholder box because the starter creature is never granted on this route.)
7. **Friction.** Re-arm gates ("step out of every ring first"), long walks between
   pedestals and a table, and verbs explained in a footer line.

## Principles for the pass

- **Keep the intrinsic mechanic; make the kid *construct* the answer, not pick it.**
  The best moments in these games are when the math physically happens (camels
  pour out, slabs fill the line). Move the child's action into that moment: they
  build the array, pour the slabs or route the droplet. Picking among three
  finished answers should become rare, used only where construction is impossible.
- **Gentle stakes, never a fail-out (ages 7–9).** A slow threat or a soft clock
  costs *bonus*, not progress. Wrong attempts are informative and quick to retry;
  the existing within-session retry queue and `recordAnswer` keep working.
- **Run structure:** a 10-second hook → 2 easy warm-up rounds → 2–3 escalating
  rounds → a **finale/boss round** with a twist → celebration with a score
  count-up, best-score flag and streak recap. Total about 3–4 minutes.
- **Juice every verb:** wind-up → impact → reaction. Use the shared kit in
  `src/games/_juice/`:
  - `juice.burst / confetti / dust / text / shake`, plus `useSquash` for squash-and-stretch;
  - `<JuiceLayer/>` mounted inside the Canvas after the camera rig;
  - `StreakMeter`, `Banner` and `ConfettiOverlay` (DOM);
  - `sfx.pop / whoosh / thud / sparkle / combo(n) / fanfare`.
- **Something to chase:** score = base per correct + streak multiplier + speed
  bonus. Show a personal best per game, stored locally under the game's own key
  so there is no store-schema change. Award a small collectible or a cosmetic
  "badge moment" for a perfect run.
- **Presentation:** each game is a lively toon place built with the World's kit
  (`src/toon`, the area kits under `src/world/areas/*`, the World sky and terrain
  look). Frame the action large on screen, and have the host character react
  (cheer, wobble, point). Keep prompts to a few words plus icons; the math is
  shown as chalk numbers and objects.
- **Controls:** WASD/arrows plus tap-to-walk (added to the shared walk code in
  parallel). Keep walks short (≤ 4–5 units between interactions), remove re-arm
  gates where a better trigger exists (e.g. "carry it onto the table" instead of
  "leave every ring").
- **Grant the starter creature** on these routes (`useStarterCreature`) so the
  kid always plays as their creature.

## Per game

### Crystal Golems (Division Arena)
Golems **march toward the camel pen** along a lane (slow, readable). The kid grabs
the divisor crystal and throws it as before. A right throw shatters the golem into
exactly `quotient` mini-camels, which run into the pen and are **counted up out
loud as they arrive**: that count is the quotient, seen. A wrong throw bounces off
(thud, dust); the golem keeps coming. If a golem reaches the pen it stomps (shake)
and costs the streak, not the run. A streak builds a combo. **Finale:** a Giant
Golem with a big dividend that must be split in two steps (e.g. 48 → ÷2 → 24 → ÷3
→ 8) with a health bar and a big shatter.

### Times Grove
**Plant the array yourself.** The keeper's order ("3 rows of 4") lights a planting
field. Walking over tiles plants saplings; rows auto-snap so the kid builds a
rectangle. When the planted shape matches the order, the trees bloom row by row with
a chant ("4… 8… 12!") and the commutativity beat on rows ≠ columns. A wrong shape
shows its own count, with a quick replant. Mix in a couple of fast "which plot?"
rounds for variety. **Finale:** a big order (5 × 6) against a blooming-clock bonus,
or "two fields, same total" (3 × 4 vs 2 × 6).

### Fraction Forge
**Pour it yourself.** Stepping on the slab press stamps one `1/d` slab at a time
onto the kid's stack (counted on the tray). Walking onto the measuring table pours
the stack into the gauge, where it fills to the recipe line exactly, falls short,
or *overflows with a silly candy spill*. Orders arrive on a conveyor with a gentle
"customer patience" meter (bonus only). **Finale:** a two-candy order (`1/2 = ?/8`
and `2/3 = ?/6` back to back), or a giant bar.

### Cloud Keeper
**Be the droplet's guide.** The kid carries a water droplet through the cycle
(sun-warmed lake → rising vapor → cloud → rain → river → lake). They walk it to the
next station *in order*; each station plays its process (evaporation shimmer,
condensation puffing up a cloud, rain falling). Wrong stations wobble and explain in
three words. Weather events add variety: a sunny day speeds up evaporation, a
mountain makes rain. **Finale:** a storm round where three droplets must be routed
before the rainbow appears.

## Keep / don't break
- Stage completion parity: `awardStage`, coins, `recordSession`, stars,
  `recordAnswer(correct, problem)` → `factStats`, grade tiers.
- The pure `src/lib/{arena,grove,forge,cycle}` cores stay unit-tested: extend them
  for new logic (shape matching, pour state, route order, scoring) and keep the
  tests green.
- DEV QA hooks (`window.__sq*`) stay honest, and must report the new state.
- Offline single file: no network assets.
