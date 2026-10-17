# Narration handoff: re-render the lesson voice with a local TTS model

**For:** the local agents (and humans) rendering SummerQuest's lesson narration on a
machine with a GPU and the TTS models on disk: **Qwen3-TTS** and/or **Higgs Audio v3**.

**Goal:** replace the current Microsoft Edge "Jenny" clips with one consistent, warm,
higher-quality voice for every lesson step. The output must follow the contract
below exactly, because the app's motion graphics are timed to the clips. Everything
you produce is checked by `npm run tts:check` and the test suite.

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
`{ "voice": "higgs-audio-v3:belinda-v1" }`. Changing it makes **every** existing clip
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

### Higgs Audio v3 (`bosonai/higgs-audio-v3-tts-4b`)
- Serve the local weights with SGLang-Omni: `sgl-omni serve --model-path <path> --port 8000`.
- Call the OpenAI-compatible endpoint `POST http://localhost:8000/v1/audio/speech` with
  `{"model": "higgs-audio-v3-tts", "input": <text>, "voice": <preset or clone ref>}`.
  Use one preset (or one cloning reference) for every clip.
- Follow the model card / SGLang-Omni cookbook for voice cloning and style tags. Keep
  any style or emotion tags identical across clips.
- **License:** Higgs Audio v3 is under a *research and non-commercial* license. Fine for
  a family project; anything commercial needs Boson AI's commercial license. Qwen3-TTS
  is Apache-2.0.

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
- **Missing clips** play through the browser's built-in speech, and the motion
  graphics still run on an estimated timeline, so a partial render never breaks a
  lesson. It just sounds worse.
