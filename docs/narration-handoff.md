# Narration handoff: re-render the lesson voice with a local TTS model

**For:** the local agents (and humans) rendering SummerQuest's lesson narration on a
machine with the TTS models on disk: **Higgs Audio v2** (MLX, the engine of the shipped
clips) and/or **Qwen3-TTS**. Section 7 covers the voice lines (K–5 screens, games and spoken
questions), rendered the same way into `public/voice`.

**Goal:** replace the current Microsoft Edge "Jenny" clips with one consistent, warm,
higher-quality voice for every lesson step. The output must follow the contract
below exactly, because the app's motion graphics are timed to the clips. Everything
you produce is checked by `npm run tts:check` and the test suite.

---

## 0. The current render job (2026-10-22)

Kindergarten and 1st grade are complete in code (see `docs/PROJECT_STATUS.md`), and none of
their audio is recorded yet. They are voice-first, so these clips matter most. The
grade 2–4 lessons are already recorded and need nothing.

| Set | Fresh | To render | Voice id |
|---|---|---|---|
| Lessons (`npm run tts:check`) | 45 steps (the 11 grade 2–4 lessons) | **97 steps**: 13 K lessons (`k*`) and 11 1st-grade lessons (`g1*`) | `narrationVoice.json`: `…calm-teacher-v1` (unchanged) |
| Voice lines (`npm run voice:check`) | 0 | **7,330 clips** in 36 packs | `voiceId.json`: `…calm-teacher-v1:k` |

**1. The K delivery reference first.** K–1 should sound slower and warmer (§7.2, "K delivery").
- If you don't have one yet, make the K reference pair with the same `calm-teacher-v1` persona.
- Use it for both the K–1 voice lines and the K–1 lesson steps.
- The reference is not part of the hash, so the K–1 lesson steps keep the lesson voice id and still render with the K reference.

**2. Pilot.** Render, then listen in the app:
```bash
$PY scripts/tts/render_local.py --set voice --engine higgs --ref-audio $K_REF --only ui,listen,k-nav,slots
$PY scripts/tts/render_local.py --engine higgs --ref-audio $K_REF --only kCounting,g1Adding
```
- Check the slot words for level list intonation (§7.4) before rendering any big stitched pack.
- Open `npm run dev`, make a kindergarten and a 1st-grade player, and walk the map, one zone and one lesson for each.

**3. Everything else:**
- Voice lines: the K packs (`k-*`), then the 1st-grade packs (`g1-*`), then `parade`.
- Lessons: the rest of the `k*` and `g1*` lessons:
  ```bash
  --only kShapes,kLetters,kRhymes,kTracing,kAddTake,kStoryMath,kCompare,kTeens,kMeasure,kSorting,kScience,kTowers,g1Reading,g1Writing,g1Tens,g1Shares,g1Shapes,g1Measure,g1Graphs,g1Science,g1Subtract,g1StoryMath
  ```
- Everything is idempotent, so an interrupted run just resumes.
- The biggest packs are `g1-facts` (1,118), `g1-tens` (750), `g1-woods` (628), `parade` (505), `g1-towers` (403), `k-compare` (402) and `k-woods` (348).

**4. Listen for these in particular** (flagged by the builders):

| Lines | What to listen for |
|---|---|
| Phonics sounds (`k-sounds`, `g1-phonics`) | Isolated letter sounds are hard for a TTS. This is also the plan's owner decision 4: keep them, or record the 44 sounds by hand. |
| Stitched 1st-grade sentences: `g1-facts` `sayPlus`/`sayMinus`/`sayPlus3`, the `subB-*` "minus what…" questions, the 114 `minusWouldHave` lines | Seams between pieces, and "minus" spoken for "−" |
| Numbers up to 120 (`g1-tens`, `slots/number`) | Clear and level |

**5. Verify and commit** as in §4 step 8–9 and §7.2:
- `npm run tts:check`
- `npm run voice:check -- --strict`
- `VOICE_STRICT=1 npx vitest run src/voice`
- `npx vitest run src/tutoring`

Commit `public/tts/**` and `public/voice/**` with their manifests.

**Size:** 7,330 short clips at 56 kbps is roughly 25–35 MB in `public/voice`. That is well over the 8 MB lesson budget, so tell the integrator the real total. If needed, the store build can ship K–1 packs separately later.

**Still coming:** 5th grade is being built now.
- Its lessons are grade-5 "own" mode, so they use the normal lesson voice and reference, not the K one.
- It adds lesson steps but almost no voice lines.
- After it merges: `git pull`, `npm run tts:dump`, then re-run the lesson render. Only the new `g5*` steps render.

---

## 1. What the app expects (the contract)

Source of truth for the words: the lessons in `src/tutoring/lessons/*.ts`. Each lesson
step has a `narration` string. `npm run tts:dump` writes all of them to
`src/tutoring/narration.json`:

```json
{ "fractions": [ { "stepId": "parts", "text": "A fraction shows part of a whole. …" }, … ], … }
```

For **every** `lessonId/stepId` in that file you produce:

| Output | Path | Notes |
|---|---|---|
| Audio | `public/tts/<lessonId>/<stepId>.mp3` | mono MP3, 24 kHz (22.05–48 kHz OK), 48–64 kbps |
| Word timings (strongly recommended) | `public/tts/<lessonId>/<stepId>.words.json` | `{ "words": [ { "w": "A", "s": 0.12, "e": 0.25 }, … ] }`, seconds from the start of the **final** MP3 |
| Manifest entry | `public/tts/manifest.json` | see below |

Manifest (`public/tts/manifest.json`) is one object keyed by `"<lessonId>/<stepId>"`:

```json
{
  "fractions/parts": {
    "file": "tts/fractions/parts.mp3",
    "hash": "3f9c01ab7e",
    "duration": 11.42,
    "words": "tts/fractions/parts.words.json"
  }
}
```

- **`file`**: exactly `tts/<lessonId>/<stepId>.mp3`.
- **`hash`**: the first 10 lowercase hex chars of **SHA-1** of the UTF-8 string
  `` `${voice}|${text}` ``.
  - `voice` is the `"voice"` value in `src/tutoring/narrationVoice.json`.
  - `text` is the step's narration **exactly** as in `narration.json` (no trimming, no edits).
  - Python: `hashlib.sha1(f"{voice}|{text}".encode("utf-8")).hexdigest()[:10]`.
- **`duration`**: seconds (float, 2 decimals) of the final MP3. Optional but expected.
- **`words`**: path of the word-timings file. Optional but expected.

**The voice id.** Before rendering, set `src/tutoring/narrationVoice.json` to a new
unique id naming the engine, voice and version, e.g.
`{ "voice": "qwen3-tts-1.7b:clone:sunny-teacher-v1" }` or
`{ "voice": "higgs-audio-v2-mlx-q8:clone:calm-teacher-v1" }` (the current one). Changing it makes **every** existing clip
stale, so the app, the tests and `tts:check` all expect a full re-render. Bump the
suffix (`-v2`) whenever you change the voice settings.

**Why the timings matter.** Each lesson step has a motion-graphics scene that calls
`cue('a phrase from the narration')` (see `src/tutoring/motion/`). Without
`words.json` the app guesses each phrase's time from its character position. With
it, every animation beat lands on the exact word. Timings must be relative to the
**trimmed** MP3 you ship.

---

## 2. Voice direction

- **Who:** a warm, cheerful, patient elementary-school teacher talking to a
  7–9-year-old. Smiling, encouraging, never sing-song or babyish.
- **Pace:** calm, about 140–155 words per minute (`tts:check` warns outside about 10–18
  characters per second). Short natural pauses at sentence ends.
- **Consistency:** one voice and one style for every clip. Kids hear lessons back to
  back, so a timbre change between steps is jarring.
- **American English**, clear consonants (kids will imitate "fourths", "denominator").

### Qwen3-TTS (`pip install -U qwen-tts`; models: `Qwen3-TTS-12Hz-1.7B-*` / `0.6B-*`)
Recommended for consistency: **design once, then clone**.
1. Use **VoiceDesign** (`Qwen3-TTS-12Hz-1.7B-VoiceDesign`, `model.generate_voice_design(text=…, language="English", instruct=…)`)
   to audition a few teacher voices on one sample paragraph. Example `instruct`:
   *"A warm, friendly American woman in her thirties who teaches second grade; clear,
   gentle, encouraging, smiling as she speaks, calm medium pace."* Pick the best take,
   which becomes your reference clip (≈10 s) plus its transcript.
2. Render every step with the **Base** clone model (`Qwen3-TTS-12Hz-1.7B-Base`,
   `model.generate_voice_clone(text=…, language="English", ref_audio=…, ref_text=…)`).
   Every clip then shares the same timbre.
3. Simpler alternative: **CustomVoice** (`Qwen3-TTS-12Hz-1.7B-CustomVoice`,
   `model.generate_custom_voice(text=…, language="English", speaker="Aiden", instruct="Warm, encouraging, calm pace.")`).
   `Aiden` is the "sunny American male" preset and `Ryan` the more energetic one.
   Keep `instruct` identical for every clip.

Load with `Qwen3TTSModel.from_pretrained(<local dir or HF id>, device_map="cuda:0", dtype=torch.bfloat16)`
(add `attn_implementation="flash_attention_2"` if installed). It returns `wavs, sr`;
write with `soundfile`, then encode (see §3). Batch lists of texts for speed.

### Higgs Audio v2 (`bosonai/higgs-audio-v2-generation-3B-base`, MLX q8: `mlx-community/higgs-audio-v2-3B-mlx-q8`)
The engine of the shipped clips, run locally on the Mac with MLX by
`scripts/tts/render_local.py --engine higgs` (venv `~/Projects/contentgen/higgs-mlx/.venv`,
models from the HF cache).
- **Zero-shot clone** from one reference pair: a ~12–15 s wav plus its exact transcript
  (`.txt` next to it). The reference is the synthetic `calm-teacher-v1` persona designed with
  Qwen3-TTS VoiceDesign (`docs/licensing/higgs-v2.md`, "Provenance"). Use the same pair for
  every clip.
- No style tags: delivery comes from the reference and the text's punctuation.
- No seed control in this port: every take is a fresh draw, so quality comes from the gates
  in §4bis and retries, not from a lucky setting.
- **License:** the Boson Higgs Audio 2 Community License: commercial use is allowed below
  100,000 annual active users, with the attribution notices in
  `docs/licensing/higgs-v2.md`. Qwen3-TTS is Apache-2.0.

Pick whichever engine sounds best on the pilot (§4, step 3). Don't mix engines.

---

## 3. Audio post-processing (every clip)

1. **Trim** leading silence to ≤ 0.15 s and trailing silence to ≤ 0.3 s.
2. **Normalize loudness** to about −16 LUFS integrated, peaks ≤ −1 dBTP, so clips sit
   at the same level as the game's sounds.
3. **Encode** mono MP3 at 48–64 kbps.

Example with ffmpeg:
`ffmpeg -y -i in.wav -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.25,areverse,loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -ar 24000 -b:a 56k out.mp3`

4. Measure the final **duration** (e.g. `ffprobe -v error -show_entries format=duration -of csv=p=0 out.mp3`).
5. **Word timings:** force-align the final MP3 against the exact step text, for
   example with WhisperX (`whisperx.align`), `stable-ts` (`model.align(audio, text)`)
   or any CTC forced aligner. Write `{ "words": [ { "w", "s", "e" } ] }` with
   seconds relative to the final MP3, in order, `e ≥ s`, never going backwards. The
   app matches words to the text ignoring case and punctuation, so `"half."` is fine.
6. **Pronunciation:** if a word comes out wrong (a name, "thirds" vs "third"), fix it
   by rewording the **lesson text** in `src/tutoring/lessons/*.ts`, because the
   on-screen captions show the same text. Then `npm run tts:dump` and re-render
   that step. Don't feed the model different text from the lesson; the hash, the
   captions and the cue timings all assume they match.

---

## 4. Procedure

1. `git pull`, then `npm ci`.
2. `npm run tts:dump` refreshes `src/tutoring/narration.json` from the lessons, so you
   always render the current text.
3. **Pilot:** render the `fractions` lesson only. Listen to every clip, open
   `npm run dev`, then go to `/tutor/fractions` with sound on. Confirm:
   - the voice is right;
   - the captions highlight in time;
   - the animation beats land on the spoken phrases.

   Adjust voice settings and re-render until happy.
4. Set the final voice id in `src/tutoring/narrationVoice.json`.
5. **Write a renderer** at `scripts/tts/render_local.py` (keep it in the repo so
   re-renders are one command). Requirements:
   - CLI: `--engine qwen|higgs`, `--model <path>`, voice options, `--only <lessonId[/stepId]>`, `--force`.
   - Reads `src/tutoring/narration.json` and `src/tutoring/narrationVoice.json`.
   - **Idempotent:** skip a step when its manifest entry already has the current hash
     and its files exist.
   - For each step: synthesize → post-process (§3) → align → write the MP3 and
     `.words.json` → update that manifest entry.
   - **Manifest writes:** keep `manifest.json` sorted the same way as `narration.json`,
     and write it atomically (temp file + rename) after each clip, so an interrupted
     run is resumable.
   - Logs one line per clip (`wrote fractions/parts 11.42s 61 words`) and exits non-zero on failure.
   - Add an npm script: `"tts:local": "python scripts/tts/render_local.py"`. Document its
     setup (a Python venv with `requirements.txt`) at the top of the file.
6. Render everything.
7. `npm run tts:prune` removes clips for steps that no longer exist.
8. **Verify:**
   - `npm run tts:check` must report every step fresh with 0 problems. Read the warnings
     about pace and timed-word counts, and fix anything real.
   - `npx vitest run src/tutoring` (the narration sync tests) must pass.
   - `npm run lint`, `npx tsc -b --force` and `npm run build` must pass.
   - Spot-check several lessons in the browser with sound on.
9. **Commit:** `narrationVoice.json`, `public/tts/**` (MP3s, `.words.json` files,
   `manifest.json`), `scripts/tts/**` and the `package.json` script. Message ending with your
   attribution lines. Open a PR titled "Narration: re-render lessons with <engine>/<voice>".

**Size budget:** keep `public/tts` under about 8 MB in total (56 kbps mono is roughly
0.4 MB per minute).

---

## 4bis. Per-clip quality gates (the standard, enforced by `render_local.py`)

Every take must pass all three checks before it is written; misses are re-rendered
as fresh sampling draws (this MLX port has no seed control; bad draws are common and
retry convergence is the fix). If a whole paragraph fails 3 gated attempts, the
renderer falls back to **breath-group rendering**: sentences of ≥10 words or containing
a colon-enum are split at comma/colon (short inputs almost never skip words), each
group is gated, then stitched with 280 ms pauses and the whole clip re-verified.

1. **Duration window** — raw mp3 length within `[words/5.0 s, words·(2.4/2.6)+2 s]`;
   the cap catches v2's missing-stop-token runaways.
2. **Content integrity** — independent Whisper transcription recovers ≥ 94% of the
   script's words. Comparison is done in *canonical numeric form* (`scripts/tts/textnorm.py`):
   scripts spell numbers out ("four plus three equals fourteen"), Whisper hears
   digits/symbols ("4+3=14") — raw token diffs report fake truncations on math lines.
   Scoring takes the better of token-level and character-level match, so Whisper's
   boundary quirks ("short hand" → "shorthand") don't count as missing words.
3. **Pace** — spoken words-per-minute from the word span (first word start → last
   word end) ≤ 210 wpm, the pace of the owner-approved samples (~160–190 wpm).
   Trailing padding can't hide a rushed read. Word-span timing is only trusted
   for ≥3 s of speech; shorter clips/sentences are pace-exempt (timing noise).

Audit any rendered set at any time with `npm run tts:audit` (re-transcribes every
manifest clip and flags anything violating the standard). Stitched clips carry a
0.90 whole-clip bar instead of 0.94: every unit already passed 0.94 individually,
and re-transcribing the seams adds Whisper noise; 0.90 still catches any dropped
unit at these clip sizes.

---

## 5. Acceptance checklist

- [ ] One voice id in `narrationVoice.json`, used for every clip.
- [ ] `npm run tts:check` reports N/N fresh, 0 problems.
- [ ] Every clip has `duration` and `words` in the manifest.
- [ ] Loudness is consistent and there's no clipping; leading silence ≤ 0.15 s.
- [ ] No mispronunciations across all lessons (listened through once end to end).
- [ ] In the app, captions highlight in sync and scene beats land on their words for
      the pilot lesson and at least three others.
- [ ] Tests, lint and build pass, and the renderer script is committed with setup notes.

## 6. Notes

- **Re-rendering later:** whenever lesson text changes, run `npm run tts:dump`, then
  `npm run tts:local` (only the changed steps re-render, since their hash changed),
  then `npm run tts:check`.
- **The old Edge renderer** (`npm run tts`, `scripts/generate-tts.mjs`) still works as a
  fallback and uses the same voice-id file and manifest format.
- **`--dry-run`** prints the work list (what would render, what is up to date) without
  loading any model, for either set.
- **Missing clips** play through the browser's built-in speech, and the motion
  graphics still run on an estimated timeline, so a partial render never breaks a
  lesson. It just sounds worse.

---

## 7. Voice lines (K–5 screens, games and spoken questions)

Everything the app says **outside** the lessons: screen and game instructions, feedback
("Great job!") and the spoken questions of the K–1 quizzes. Kindergarten and grade 1 are
voice-first, so these clips are what a five-year-old hears instead of reading. They use the
same engine, the same timbre and the same post-processing as the lessons, rendered with the
same script, into their own folder and manifest so they never disturb the lesson clips.

### 7.1 The contract

- **Source of truth:** the voice packs, `src/voice/packs/<pack>.ts` (one `defineVoicePack`
  default export each). A pack has fixed `lines` (id → exact text) and `templates` (text
  with `{slot}` placeholders plus the allowed slot values). See `src/voice/types.ts`.
- **The catalog:** `npm run voice:dump` writes `src/voice/voiceLines.json`, every clip to
  record:

  ```json
  { "voice": "higgs-audio-v2-mlx-q8:clone:calm-teacher-v1:k",
    "clips": { "ui/tapToStart": { "text": "Tap the star to start!", "hash": "1c0e…", "kind": "line",
                                  "file": "voice/ui/tapToStart.mp3" }, … } }
  ```

  A test fails when it's out of date with the packs, as for `narration.json`.
- **The voice id** lives in its own file, `src/voice/voiceId.json`
  (`higgs-audio-v2-mlx-q8:clone:calm-teacher-v1:k`), so the K delivery can be re-rendered on
  its own without touching the lessons. Bump its suffix (`…:k2`) when you change the voice
  settings; every voice clip then goes stale.
- **Keys and files** (`src/voice/catalog.ts`):

  | Clip | Key | Says | File |
  |---|---|---|---|
  | fixed line | `ui/tapToStart` | the line, verbatim | `voice/ui/tapToStart.mp3` |
  | `whole` template, one per combination | `k-math/tapGroupWith/n=7,thing=apples` | "Tap the group with seven apples." | `voice/k-math/tapGroupWith/n=7,thing=apples.mp3` |
  | `stitch` template, carrier piece *i* | `k-math/tapGroupWith#0` | "Tap the group with" | `voice/k-math/tapGroupWith.part0.mp3` |
  | slot value, shared by every pack | `slots/number/7`, `slots/word/apples` | "seven", "apples" | `voice/slots/number/7.mp3` |

  Slots in a whole key are in name order; slot words are slugged (`ice cream` → `ice-cream`).
  `#` is written `.part` in file names because it would end a URL. Each clip has its
  `.words.json` next to it.
- **Manifest:** `public/voice/manifest.json`, keyed by clip key, **the same entry shape as
  the lessons** (`file`, `hash`, `duration`, `words`). The hash is the same rule:
  first 10 hex of SHA-1 of `` `${voice}|${text}` `` with `text` exactly as in the catalog.
- **Numbers are spoken as words.** Captions keep digits ("Tap the group with 7 apples."), the
  clip text spells them out ("…with seven apples."), American style: `twenty-one`,
  `one hundred five` (no "and"), which is what `textnorm.py` reads back from Whisper. The
  player maps the word timings back onto the digits.
- **`whole` or `stitch`:** a template without `render` is recorded whole up to 200
  combinations and stitched above that. `render: 'whole'` with more than 400 combinations
  fails `voice:dump`: switch it to `stitch`. Whole is better (natural prosody); stitch is
  what makes big spaces (numbers 0–120 × 40 nouns) possible.
- **Stitching:** the carrier pieces are the text between slots. Leading punctuation and
  spaces are dropped from a piece (". How many" is recorded as "How many"); they become the
  pause before it. The player plays the pieces and slot values back to back on the shared
  audio element with these pauses: 0.05 s within a phrase, 0.18 s at a comma, 0.35 s at a
  sentence end.
- **Missing clips** are read by the tablet's own voice (device speech), and if there is
  none, the line's animations run on an estimated silent timeline. A line never mixes
  recorded and device voices: one missing piece and the whole line falls back.

### 7.2 Render on the Mac

```bash
git pull && npm ci
npm run voice:dump                    # refresh src/voice/voiceLines.json from the packs
npm run voice:check                   # what's fresh / stale / missing / orphaned
PY=~/Projects/contentgen/higgs-mlx/.venv/bin/python3
REF=~/Projects/contentgen/qwen3-tts/refs/sq_teacher_v2.wav     # or the K reference, below
$PY scripts/tts/render_local.py --set voice --dry-run           # the work list; loads nothing
$PY scripts/tts/render_local.py --set voice --engine higgs --ref-audio $REF --only ui   # pilot
#   … listen, open the app (Parent area → Voice check), adjust, then everything:
$PY scripts/tts/render_local.py --set voice --engine higgs --ref-audio $REF
npm run voice:prune                   # drop clips nothing uses any more
npm run voice:check -- --strict       # every clip fresh, 0 problems
VOICE_STRICT=1 npx vitest run src/voice   # the coverage gate
```

- `npm run voice:local -- --engine higgs --ref-audio $REF` is the same command when the
  venv's python is your `python3`.
- **Idempotent and resumable** like the lesson set: a clip whose manifest hash matches and
  whose files exist is skipped; the manifest is rewritten atomically after every clip.
  `--force` re-renders, `--only` takes a key, a pack (`ui`, `slots`), a template
  (`k-math/tapGroupWith`: its combinations or its pieces) or a slot kind (`slots/number`),
  comma-separated.
- **K delivery** (plan §3): slower (about 120–130 wpm), short sentences, more expression,
  the same `calm-teacher-v1` timbre. Higgs v2 has no style tags, so delivery comes from the
  reference clip: make a K reference pair with the same persona read more slowly and warmly
  (Qwen3-TTS VoiceDesign, e.g. *"…the same teacher, speaking slowly and warmly to a
  five-year-old, with clear pauses"*, then pick the take that still sounds like her) and pass
  it with `--ref-audio`. Keep that pair banked next to `sq_teacher_v2` and note it in
  `docs/licensing/higgs-v2.md`.
- **Size:** 56 kbps mono is about 7 KB per second; the K–1 pilot (~400 short clips) is
  3–5 MB.

### 7.3 Quality gates (voice lines)

- **Clips of 3 words or fewer** ("Great job!", "seven", "Tap the"): Whisper must hear
  **exactly** the clip's words in canonical form (numbers as digits, case and punctuation
  ignored), and the trimmed length must be within `[0.25·words, 1.2 + 0.8·words]` seconds.
  A recovery ratio and a pace check mean nothing on one word, and a wrong word is the whole
  clip. Up to 5 fresh draws at rotating temperatures.
- **Longer clips:** the lesson gates of §4bis (duration window, recovery ≥ 0.94,
  ≤ 210 wpm); whole lines may fall back to breath-group rendering.
- **Trimming:** lines and whole templates keep the lesson silences (0.12 s / 0.25 s);
  carrier pieces and slot words keep almost none (0.02 s / 0.04 s), because the player adds
  the pauses between them.
- `npm run voice:check` warns on odd pace (outside 5–22 characters/s for lines of more than
  3 words) and stray files, and fails on stale or orphaned clips or bad word files.

### 7.4 Slot words: neutral list intonation

Stitching sounds natural only if every slot word is said the same way: level, "one item of
a list", neither a final fall ("…seven.") nor a question. Read alone, a model gives a single
word a full-sentence contour. Ways to steer it, best first; audition on a handful
(`--only slots/number/1,slots/number/7,slots/number/12,slots/word/apples --force`) and listen
to five stitched sentences in the app before rendering the rest:

1. **A list reference clip.** The clone copies the reference's prosody. Record (or design)
   a ~12 s reference of the same voice calmly reading a list with even, level items ("one,
   two, three, four, five, six…" or "apples, bananas, cars, ducks…"), with its exact
   transcript, and render only the slots with it:
   `--only slots --ref-audio refs/sq_teacher_list.wav`.
2. **A list-item frame.** `--slot-frame '{w},'` gives the model "seven," (a trailing comma
   tends to give the level "more to come" contour); compare with `'{w}.'` and `'{w}...'`.
3. **Carrier pieces that run into a slot** ("Tap the group with") end mid-sentence: a
   `--piece-frame '{w},'` or `'{w}...'` avoids a final fall. Pieces that end a sentence
   ("do you see?") are never framed.
4. **One session, one setting:** render all slot words with the same reference and frame,
   in one run. Mixed sessions drift.

Frames may only add punctuation (the renderer refuses anything that adds words); the gates,
the word timings and the hash always use the clip text. A frame doesn't change the hash, so
re-render with `--force` after changing it. If a template still sounds choppy, switch it to
`render: 'whole'` (up to 400 combinations): natural prosody beats a smaller download.

### 7.5 Device speech and the Fire check

The fallback is the browser's `speechSynthesis` (behind a small interface in
`src/voice/speech.ts`, so a native Capacitor text-to-speech plugin can replace it later). It
reads the caption, prefers on-device voices, and never reads the child's name.

Whether it works in the Amazon WebView is unverified. On a real Fire tablet with the store
build: Parent area (grown-up check) → **Voice check**. It shows whether `speechSynthesis`
exists, how many voices it has (on-device / English), how many recorded clips are in the
build, and has two buttons: **▶ Recorded line** (plays `ui/voiceCheck` with no fallback, so
"loaded and played" means recorded clips work) and **▶ Device voice** (the device reads a
line; "started speaking" or "silent: the engine never started"). Note what you hear and what
it says.

### 7.6 Tests

- `npx vitest run src/voice`: the catalog rules, every pack line and template resolves and
  plays only catalog clips, `voiceLines.json` is in sync with the packs, manifest clips are
  fresh, the player's playlist and clock (fake audio element), and one voice at a time with
  the lesson narration. The coverage test only reports missing clips unless
  `VOICE_STRICT=1`.
- `python3 -m unittest discover -s scripts/tts`: the renderer's voice rules (short-clip gate,
  frames, trimming, `--only`, the work list) and an end-to-end `--set voice` run with a fake
  engine and a fake Whisper (needs ffmpeg). No models needed.
