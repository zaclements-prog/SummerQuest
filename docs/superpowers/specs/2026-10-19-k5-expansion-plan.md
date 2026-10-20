# K–5 expansion: a voice-first kindergarten and a full elementary range

Date: 2026-10-19. Status: plan for owner review. Companion: `2026-10-19-trending-games-plan.md`.

## Goal

Grow SummerQuest from grades 2–4 to **kindergarten through 5th grade** (about ages 5–11).
Grades K and 1 are **voice-first**:
- a warm narrator says what to do;
- the screen shows pictures, numerals and as few words as possible;
- an on-screen guide (a spotlight and a pointing hand) shows exactly where to look and tap, timed to the voice.

Grade 5 is the opposite case: mostly new, harder content in the same style the app already has.

## Where we are today (code survey, 2026-10-19)

- **Grade scales difficulty; it doesn't change content.**
  - `GradeLevel` is `2 | 3 | 4` (`src/lib/gradeTiers.ts`).
  - Every grade gets the same 12 zones, 36 stages, 11 lessons and 4 3D games. `effectiveConfig` only turns knobs.
  - The 3D games read the grade themselves. Times Grove treats any unknown grade as its hardest.
- **Nothing outside lessons is spoken.**
  - Quizzes, games, menus and the result screens have no voice and no read-aloud button.
  - Lesson clips are pre-recorded on the owner's Mac (Higgs Audio v2, gated renderer), keyed `lessonId/stepId`.
  - The fallback is the browser's `speechSynthesis`, which is **probably silent in the Fire WebView** (unverified). A voice-first kindergarten can't rely on it.
- **Answers are text only.** `Problem.options` is `string | number`. There is no picture-answer type. Geometry draws no shapes, and place value draws no blocks, though the renderer can.
- **Highlighting exists only inside lessons.** The lesson stage has `Highlight`, `Ring`, `Arrow`, `Glow` and `cue()` synced to word timings, all inside a 960×540 SVG. Nothing can point at a real button, or at something in a 3D game, in time with a voice.
- **Hardest screens for a non-reader:**
  - avatar creation, which needs a typed name and reading the grade cards;
  - the writing pad, which is typed;
  - reading and science passages;
  - Speed Run (timed, symbolic);
  - zone pages (paragraphs);
  - every quiz prompt.

  The 3D games are closest to voice-ready.
- **Store:** the console audience is already "restricted, 0–12", so K–5 fits. The title, description, keywords, testing instructions and rating notes all say "grades 2–4" and need an update with the K–5 build.

## Design

### 1. Three grade bands, one app

| Band | Grades | Experience | Text on screen |
|---|---|---|---|
| **Listen & Play** | K, 1 | Every instruction spoken and auto-played. A guide spotlights the target. Picture and number answers. No timers. 2–3 big choices. Never type. | K: numerals, pictures and icons only. Grade 1: single short words (sight words) plus numerals. |
| **Read & Hear** | 2, 3 | Today's screens, plus a 🔊 read-aloud on every question and passage (grade 2 auto-reads the question). | As today. |
| **On my own** | 4, 5 | Today's screens. Read-aloud on tap. | As today. |

Grades set the defaults. A grown-up can override read-aloud (auto / on tap / off) in the Parent area. This is also an accessibility win for struggling readers in any grade.

### 2. Content: same island, grade-band stage sets

**Keep the 12 zones and the island.** Each zone becomes a *subject family* with a stage set per band:
- **K–1:** new;
- **2–4:** today's stages, unchanged;
- **5:** new.

This keeps the World, the map, pets, badges and the zone stars working with no new areas. New zones would each cost world layout, map art, a pet, badges and skills wiring.

The lessons follow the same rule:
- **K–1:** new short voice lessons, 2–3 minutes, with "your turn" steps;
- **2–4:** today's 11 lessons;
- **5:** new lessons.

| Zone | Kindergarten (CCSS / NGSS) | Grade 1 | Grade 5 |
|---|---|---|---|
| Multiplication Mesa | Count to 20; "how many?" (K.CC.4–5) | Add within 20: doubles, make 10 (1.OA.6) | Multi-digit multiplication; powers of 10 (5.NBT.2, 5.NBT.5) |
| Division Dunes | More / fewer / same; compare numerals to 10 (K.CC.6–7) | Subtract within 20 (1.OA.6) | Long division, 4-digit by 2-digit (5.NBT.6) |
| Fraction Falls | Add and take away within 5, then 10 (K.OA.1, K.OA.5) | Equal shares: halves and fourths of shapes (1.G.3) | Add and subtract unlike denominators; multiply fractions (5.NF.1, 5.NF.4) |
| Place Value Plateau | Teen numbers as ten plus ones, with ten-frames (K.NBT.1) | Tens and ones; compare two-digit numbers (1.NBT.2–3) | Decimals to thousandths: compare, round, operate (5.NBT.3–4, 5.NBT.7) |
| Measurement Marsh | Longer / shorter, heavier / lighter (K.MD.1–2) | Length in units; time to the hour and half hour (1.MD.2–3) | Volume; unit conversion (5.MD.1, 5.MD.3–5) |
| Geometry Grove | Name shapes, flat vs solid; above / below / beside (K.G) | Shape attributes; compose shapes (1.G.1–2) | Coordinate plane; classifying figures (5.G) |
| Data Delta | Sort and count by category (K.MD.3) | Picture graphs with up to 3 categories (1.MD.4) | Line plots with fractions (5.MD.2) |
| Word Problem Woods | Spoken story problems within 10 (K.OA.2) | Story problems within 20, three addends (1.OA.1–2) | Multi-step problems; order of operations (5.OA.1–2) |
| Reading Reef | Rhymes, first sounds, letter names and sounds, a few sight words (RF.K.2–3) | Short-vowel words, digraphs, read-along sentences (RF.1.2–3) | Level 5 passages: theme, compare texts (RL.5) |
| Writing Workshop | Trace letters and numerals with a finger | Build words and sentences from tiles; trace | Opinion and informative paragraphs (W.5.1–2) |
| Science Summit | Weather; what plants and animals need; push and pull (K-ESS2, K-LS1, K-PS2) | Light and sound; day / night and sky patterns (1-PS4, 1-ESS1) | Matter; food webs; Earth's spheres; shadows and stars (5-PS1, 5-LS2, 5-ESS1, 5-ESS2) |
| Tower Battlefront | Towers powered by counting and more / fewer gates | Add / subtract gates | Fraction and decimal gates |

- Stage ids are new per band (e.g. `count-k-1`), so stars from one band never mix with another's.
- The zone star totals, pets' growth, zone mastery and badges must read the **current band's** stage list. These are a handful of call sites (`lib/pets/growth.ts`, `ZoneDetail`, `zoneStars`, badges).
- A child who changes grade keeps their old stars. They count again if the child moves back.

### 3. Voice: a library of recorded lines

Three kinds of speech, all recorded offline in the existing teacher voice. No network and no AI at runtime.

1. **Fixed lines.** Screen and game instructions and feedback, e.g. "Tap the star to start!", "Drag three fish into the bowl.", "Great counting!".
   - They live in catalogs (`src/voice/lines/*.ts`: id → text), grouped into packs (`ui`, `k-math`, `k-reading`, a pack per game, …).
2. **Templated prompts.** Generated questions such as "Tap the group with {7} {apples}".
   - **Small spaces (≤ about 200 combinations per template):** record every whole sentence. Most K–1 prompts are small spaces, since numbers stay ≤ 20.
   - **Big spaces:** record the carrier phrase and the slot words separately (numbers 0–120, ~40 object nouns, shapes, colors, letter names and sounds, sight words), and play them back-to-back with tight gaps.
   - Providers attach a `speech` field to each `Problem`: a template id plus slots, or a fixed line id.
3. **Lesson narration.** As today.

**Pipeline changes:**
- Voice lines have their own scripts, separate from the lessons' `tts:*`:
  - `voice:dump` writes `src/voice/voiceLines.json`, every clip to record, with keys such as `ui/tapToStart`, `k-math/tapGroupWith/n=7,thing=apples` and `slots/number/7`.
  - `voice:check` and `voice:prune` work on `public/voice/manifest.json`.
- `render_local.py --set voice` renders them, with a gate for short clips: an exact word match, since there's no pace check under 3 s.
- A **coverage test** lists clips that aren't recorded yet. It fails only in strict mode (`VOICE_STRICT=1`), until the first render lands.
- See `docs/narration-handoff.md` §7.

**Runtime:**
- `useNarration` grows into a general **voice player**. It plays a line, or a playlist of segments, on the already-unlocked audio element.
- It exposes the same clock, so `cue('Tap')` timing works for any line, not just lessons.

**Delivery for K:**
- slower (about 120–130 wpm), shorter sentences, more expression;
- the same synthetic teacher timbre (`calm-teacher-v1` reference);
- rendered as its own voice id (`…:calm-teacher-v1:k`) so it can be re-rendered on its own.

**Size:**
- The K–1 pilot is about 400 short clips (about 3–5 MB).
- Full K–1 is probably 15–25 MB, which is fine in the APK.
- The old 8 MB budget was for the web build. The offline single-file build can skip the K–1 packs or fall back to speech.

**Device voice for grades 2–5.** Reading every passage aloud from recordings would be about 50 minutes of audio. Instead, use the tablet's own offline text-to-speech through a Capacitor plugin (`@capacitor-community/text-to-speech` calls Android's TTS directly; Fire OS ships an offline engine).
- First, a device spike: does `speechSynthesis` work in Amazon WebView at all? Does the plugin? How good is the Fire voice?
- Recorded clips stay the standard for K–1 and for all instructions.

**Phonics is the hard case.** Letter *sounds* (/b/, /k/) come out of TTS as letter names or with an extra "uh".
- **Plan:** audition phonetic spellings in Higgs, with a human listening pass on each of the ~44 sounds.
- **Fallback:** the owner records the 44 sounds once, which takes about 20 minutes.

### 4. The guide: spotlight, pointing hand, say-it-again

A small **Guide** system shared by every screen and game:
- **A guide step** is a voice line plus a target.
  - **2D targets** are marked with `data-guide="start"` on any element.
  - **3D targets** are a world position, projected to the screen each frame.
- **The overlay:** a soft dim with a spotlight hole on the target, a bouncing 👆 hand and a pulse ring. Each appears on its cued word ("…tap **the big star**").
- **Sequences** cover first-run tours, each K–1 question ("Count the apples" spotlights the apples; "Tap the number" spotlights the answers), game intros and navigation ("Tap the sun to start your adventure").
- **🔊 Say it again:** always on screen in K–1, top-left, big. After about 8 s with no touch, the line replays once, gently.
- **After a wrong answer:** the guide walks through it ("Let's count together: one, two, three…" with each apple lighting up), then lets the child try again. Never fail out.
- **In 3D:** one `GuideMarker` (a bouncing arrow plus a ring) replaces the three copy-pasted arrows in Forge, Cloud Keeper and Arena.

### 5. Listen & Play interactions (K–1 kit)

- **Picture answers.**
  - `ProblemAnswer` gains a picture form: `{ id, picture, speech }`. A picture is an emoji group, a numeral, a shape, a ten-frame, a clock, coins or a letter tile.
  - Tapping a card speaks its label as it is chosen ("seven!").
- **Interaction types, each a reusable component:**
  - tap-choice (2–3 cards);
  - **tap-to-count** (tap each object; the voice counts aloud; teaches one-to-one counting);
  - drag-to-make ("put 5 fish in the bowl");
  - drag-to-sort (2 bins);
  - match pairs;
  - number-line hop;
  - **finger trace** for numerals and letters, with a forgiving path check.
- **Layout and pacing:**
  - Targets at least 64 px, plenty of space, no timers (Speed Run is replaced by an untimed "Count Along" in K–1).
  - Stages are 5–6 items and 3–5 minutes.
- **Feedback:** voice plus animation. A wrong answer gets a gentle "Hmm, let's look again" and the guide's walk-through.
- **No result-screen reading:** stars, a big replay ↺ and a big next ▶. The voice says "You got three stars!"

### 6. Getting around without reading

- **First run, "Who's playing?":** a grown-up step sets the grade (K–5), behind the existing gate, or the gate's easier sibling.
  - The child then picks an animal and a color by voice: "Pick your animal friend!".
  - **The name is optional and typed by the grown-up.** The voice never says the name, which keeps the privacy policy's promise.
- **World and map:** walking up to a zone plays its voice welcome ("Counting Cove! Tap me to play!"), with the guide hand on the zone's button.
- **Zone page in K–1:** three big picture stage buttons with stars, a voice intro for each, and no paragraphs.
- **Every K–1 screen** has the 🔊 button, which explains that screen.

### 7. Grade 5

Grade 5 is mostly content; the K–1 machinery doesn't apply.
- **New procedural providers:**
  - decimals (compare, round, operate);
  - fraction add / subtract / multiply;
  - volume;
  - the coordinate plane (plot and read points; a new visual);
  - order of operations;
  - multi-digit multiplication and long division.
- **Banks:** level-5 reading and science passages, grade-5 geometry and data items.
- **Lessons:** new grade-5 lessons.
- **3D game tiers:**
  - Forge: unlike denominators;
  - Arena: two-digit divisors;
  - Grove: area models;
  - Cloud Keeper: Earth's spheres.

### 8. Quality gates

- **Content fuzz, answer bias and invariants** already loop over `GRADE_LEVELS`, so grades 0, 1 and 5 join automatically.
- **Voice coverage test:** every K–1 line, template and slot has a fresh clip.
- **Text budget test:** render each K–1 screen and fail it if more than N visible words (numerals excepted).
- **Playthrough bot:** run it per band. A K–1 bot answers via the picture options.
- **A real kindergartner on a Fire tablet.** A short scripted session with the owner's or a friend's 5-year-old after the pilot. Watch where they get stuck.

## Phase 0 contracts (in the code, shared by the parallel work)

- **`src/lib/gradeBand.ts`:** `contentBand(grade)` returns `k1 | g24 | g5`, choosing which stage set a zone uses. `experienceMode(grade)` returns `listen | readHear | own`, choosing how screens talk. `isListenMode(grade)`.
- **`src/voice/types.ts`:**
  - `VoiceRef` is `{ line: 'pack/id' }` or `{ template: 'pack/id', slots }`.
  - Packs are written with `defineVoicePack` in `src/voice/packs/<pack>.ts`; one default export per file, found automatically by `src/voice/registry.ts`.
  - `VoiceClock` and `VoicePlayback` have the same shape as the lesson narration clock.
- **`src/voice/useVoice.ts`:** `useVoice(ref, { autoPlay })` returns `{ text, playing, clock, replay, stop }`. It is a silent stub until the voice system lands; the signature stays.
- **`src/lib/problem.ts`:** `Problem.speech?: VoiceRef` (how the question is said) and `Problem.pictureOptions?: PictureOption[]` (K–1 picture answers, each standing for one of `options`). The `Picture` kinds are numeral, group, ten-frame, shape, letter, word, emoji and clock.

## Kindergarten pilot (phase 1) contract

Fixed ids shared by the parallel work. Owner decision: build the pilot now, record the voice later. Until then device speech, or silence, stands in.

**Zones and stages (the `k1` band; grades K and 1 see these):**

| Zone | K–1 title | Stages (`id`, game, kind) |
|---|---|---|
| `multiplication-mesa` | Counting Mesa | `k-count-1` Count with me (listenPlay, concept) · `k-count-parade` Critter Parade (critterParade, practice) · `k-count-3` More or fewer (listenPlay, mastery) |
| `geometry-grove` | Shape Grove | `k-shapes-1` Name that shape (listenPlay) · `k-shapes-2` Flat or solid (listenPlay) · `k-shapes-3` Shape hunt (listenPlay) |
| `reading-reef` | Letter Reef | `k-letters-1` Find the letter (listenPlay) · `k-letters-2` Big and little letters (listenPlay) · `k-letters-3` First sounds (listenPlay) |

**Lessons (`band: 'k1'`):**
- `kCounting`: Counting Mesa; its practice stage is `k-count-1`.
- `kShapes`: Shape Grove; practice `k-shapes-1`.
- `kLetters`: Letter Reef; practice `k-letters-1`.

**Rules:**
- **Zones without a K–1 set:** K–1 players see the other nine zones as "still sleeping, coming soon". They can't be entered.
- **Pets:**
  - Any of a zone's lessons hatches its pet (`lessonIds`).
  - Growth takes the best stage across the zone's bands, so switching grade never shrinks a pet.

## Kindergarten literacy (phase 1b) contract

Owner request (2026-10-20): rhyming, finishing nursery rhymes, clapping syllables, blending sounds, sight words, tracing, and story order, all for kindergarten. Writing Workshop wakes up as the fourth K zone. Handwriting style: **ball-and-stick** (upright manuscript, matching the Andika letters). The voice is recorded later, as in the pilot.

**Letter Reef (`reading-reef`), the `k1` set in unlock order:**

| # | `id` | Title | What the child does |
|---|---|---|---|
| 1 | `k-letters-1` | Find the letter | (pilot) |
| 2 | `k-rhyme-1` | Rhyme time | "Which one rhymes with cat?": three pictures |
| 3 | `k-letters-2` | Big and little letters | (pilot) |
| 4 | `k-syllables-1` | Clap the parts | tap the drum once for each part of a word ("ti-ger"), then ✓ (`drum` activity) |
| 5 | `k-letters-3` | First sounds | (pilot) |
| 6 | `k-rhyme-2` | Finish the rhyme | a traditional nursery rhyme stops before its rhyming word; tap the picture that finishes it |
| 7 | `k-blend-1` | Sound it out | "mmm… oon": tap the picture of the word |
| 8 | `k-sight-1` | Word hunt | "Find the word *see*": three word cards (the only printed words a K child sees, in Andika) |

**Writing Workshop (`writing-workshop`), the `k1` set:**

| # | `id` | Title | What the child does |
|---|---|---|---|
| 1 | `k-trace-1` | Warm-up lines | trace lines and curves: down, across, slant, circle, zig-zag (`trace` activity) |
| 2 | `k-trace-2` | Trace numbers | 0–9 |
| 3 | `k-trace-3` | Trace big letters | A–Z, by stroke family: straight lines, then slants, then curves |
| 4 | `k-story-1` | Story order | hear a three-picture story, then tap the pictures first, next, last (`order` activity) |

- **Counting Mesa bonus:** `k-count-1`'s last question asks the child to trace the number they just counted.

**Lessons (`band: 'k1'`):**
- `kRhymes`: Letter Reef (rhymes and word parts); its practice stage is `k-rhyme-1`.
- `kTracing`: Writing Workshop (start at the green dot, follow the arrow); practice `k-trace-1`.
- **Pets:** the octopus also hatches from `kRhymes`, and the dragonet from `kTracing`.

**Listen & Play activities** (`ListenProblem.activity`, registered in `src/games/listenPlay/activities/index.ts`):
- An activity takes the whole stage and reports each finished try with `onAttempt(correct)`.
- The shell still:
  - asks the question (`askSteps`, by default the line with the activity lit);
  - keeps the 🔊 and the progress dots;
  - counts first-try stars;
  - praises a right answer;
  - after a miss, says "let's look again", runs the activity's help (`registerHelp`), says "Your turn!", and raises `misses` by one.
- The three activities are `drum`, `trace` and `order`.

**Rules:**
- **Voice packs:**
  - Letter Reef work: `k-rhymes`, `k-sounds`, `k-words`.
  - Writing Workshop work: `k-trace`, `k-stories`.
  - Every stage and the Writing Workshop name and welcome also get `k-nav` lines.
- **Nursery rhymes:** traditional and long out of copyright, quoted as tradition has them.
- **Blending:** the sounds are written as the recording script reads them. Stretchable sounds come first (m, s, f, l, n, r, sh). Every phonics line is flagged for the owner's listening pass.
- **No microphone:** the child always picks or does; they never say an answer.
- **Pictures:** emoji every Android tablet draws (Unicode 9 or older), as in the pilot's picture words.
- **Tracing:**
  - forgiving: start near the green dot, stay roughly on the path, cover most of it, in stroke order;
  - after a stroke goes wrong twice, the hand shows it;
  - never a timer, and never failing out.
- **Store build:** unchanged. K stays behind `VITE_K1`.

## Phases

| Phase | What ships | Notes |
|---|---|---|
| **0. Foundations** | `GradeLevel` 0–5 with band-aware stage sets; the voice-line system (catalogs, dump, render, check / prune, playlist player, cues); the Guide (DOM spotlight plus 3D marker); picture answers plus the Listen & Play quiz shell; a Fire TTS spike | Nothing visible to kids yet. Every existing grade-2–4 test stays green. |
| **1. Kindergarten pilot** | 3 K zones end-to-end (Counting, Shapes, Letters): voice lessons, 3 stages each, non-reader onboarding, guided World and zone navigation | Render about 400 clips on the Mac. Playtest with a 5-year-old. |
| **2. K complete, then grade 1** | The other 9 K zones, then grade 1 (phonics read-along, tens and ones, time) | Phonics sound decision (§3). |
| **3. Grade 5** | Providers, banks, lessons, game tiers | Can run in parallel with phase 2. |
| **4. Store update** | New title (e.g. "SummerQuest: Learning Games K–5"), keywords, K and grade-5 screenshots, a rating re-check for 5-year-olds, a privacy-policy line about the device voice reading questions | A new versionCode. Testing instructions re-entered. |

**The games track** (`2026-10-19-trending-games-plan.md`) runs alongside these phases:
- the gate engine and Critter Parade for grades 2–4 during phase 0, since they don't need the voice system;
- the K–1 Parade in phase 1;
- grade-5 gates in phase 3.

## Owner decisions

1. **Zone structure:** grade-band stage sets inside today's 12 zones (recommended), or separate K–1 zones on the island.
2. **Grade 2–5 read-aloud:** the Fire's own voice through a plugin (recommended), or recordings for everything (larger APK, much more rendering).
3. **K narration delivery:** a slower K voice id (recommended), or the same lines and pace as the lessons.
4. **Phonics sounds:** try Higgs first with a listening pass (recommended), or record the 44 sounds yourself.
5. **Who picks the grade on first run:** a grown-up step (recommended), or the child as today.
6. **Order:** Kindergarten pilot first (recommended), or grade 5 first (quicker, but it doesn't test the voice-first design).
