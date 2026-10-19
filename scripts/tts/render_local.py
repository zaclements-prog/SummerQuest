#!/usr/bin/env python3
"""Render SummerQuest lesson narration with a LOCAL TTS engine (docs/narration-handoff.md).

Engines:
  qwen  — Qwen3-TTS 1.7B Base clone. Venv: ~/Projects/contentgen/qwen3-tts/.venv
          Model: ~/Projects/contentgen/qwen3-tts/models/Qwen3-TTS-12Hz-1.7B-Base-8bit
  higgs — Higgs Audio v2 3B (MLX q8, voice cloning). Venv: ~/Projects/contentgen/higgs-mlx/.venv
          Models: mlx-community/higgs-audio-v2-3B-mlx-q8 + higgs-audio-v2-tokenizer (HF cache)
          License: Boson Higgs Audio 2 Community License (see docs/licensing/higgs-v2.md).

Both venvs need: stable-ts (word alignment), soundfile, numpy. ffmpeg on PATH.
Ref pair: a ~12-15 s reference wav + its EXACT transcript .txt next to it.

Usage (from the repo root):
  ~/Projects/contentgen/higgs-mlx/.venv/bin/python3 scripts/tts/render_local.py \
      --engine higgs --ref-audio /path/teacher_ref.wav \
      [--only fractions] [--only fractions/step] [--force] [--dry-run]

Voice lines (K-5 screens and games; docs/narration-handoff.md, "Voice lines"):
  ... render_local.py --set voice --engine higgs --ref-audio /path/teacher_ref.wav \
      [--only ui] [--only slots/number] [--only k-math/tapGroupWith] \
      [--slot-frame '{w},'] [--piece-frame '{w}'] [--force] [--dry-run]
  Reads src/voice/voiceLines.json + src/voice/voiceId.json (run `npm run voice:dump`
  first), writes public/voice/<key>.mp3 + .words.json and public/voice/manifest.json
  the same way. Clips of <= 3 words get the short-clip gates (exact canonical words
  from Whisper, a short-clip duration window); stitched pieces and slot words are
  trimmed tight so they play back to back. --dry-run prints the work list and loads
  nothing (no engine, no --ref-audio needed).

Reads  src/tutoring/narration.json + src/tutoring/narrationVoice.json.
Writes public/tts/<lesson>/<step>.mp3 + .words.json, updates public/tts/manifest.json
atomically after every clip (resumable). Idempotent: a step whose manifest hash
already matches the current voice|text and whose files exist is skipped (use --force).
Every clip passes a duration gate (WattMoth Higgs lesson: v2 sometimes omits its
stop token and appends silence); out-of-window takes are re-rendered at a nudged
temperature, never shipped. Exit code non-zero on any failure.
"""
from __future__ import annotations

import argparse, hashlib, json, os, subprocess, sys, tempfile, time
from pathlib import Path

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import voicelines as vl  # noqa: E402  (pure helpers, next to this file)

REPO = Path(__file__).resolve().parents[2]
NARR = REPO / "src/tutoring/narration.json"
VOICEF = REPO / "src/tutoring/narrationVoice.json"
TTS_DIR = REPO / "public/tts"
MANIFEST = TTS_DIR / "manifest.json"
PUBLIC = REPO / "public"
VOICE_LINES = REPO / "src/voice/voiceLines.json"
VOICE_ID = REPO / "src/voice/voiceId.json"
VOICE_MANIFEST = PUBLIC / "voice/manifest.json"
SAMPLE_RATE = 24000
WPS_EST = 2.6  # rough words-per-second for teacher pace, for sanity windows


def sha1_10(voice: str, text: str) -> str:
    return hashlib.sha1(f"{voice}|{text}".encode("utf-8")).hexdigest()[:10]


def duration_window(words: int) -> tuple[float, float]:
    """Raw-length sanity window. Floor only catches degenerate clips (~5 wps);
    the real pace standard is the word-span ASR check in render_verified, and
    the cap catches the v2 missing-stop-token runaway."""
    return max(0.6, words / 5.0), words / WPS_EST * 2.4 + 2.0


def load_json(p: Path, default=None):
    if not p.exists():
        if default is not None:
            return default
        sys.exit(f"FATAL: missing {p}")
    return json.loads(p.read_text("utf-8"))


def atomic_write(p: Path, data: str):
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(data, "utf-8")
    os.replace(tmp, p)


def ff(args: list[str]):
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-nostdin"] + args,
                      capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {r.stderr[-300:]}")


def postprocess(in_wav: Path, out_mp3: Path):
    """Trim silences, loudnorm to -16 LUFS, mono 24 kHz 56k MP3 (handoff §3)."""
    ff(["-i", str(in_wav),
        "-af", ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,"
               "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.25,areverse,"
               "loudnorm=I=-16:TP=-1.5:LRA=11"),
        "-ac", "1", "-ar", str(SAMPLE_RATE), "-b:a", "56k", str(out_mp3)])


def postprocess_voice(in_wav: Path, out_mp3: Path, tight: bool):
    """postprocess() for voice lines: the same chain, but stitched pieces and
    slot words keep almost no silence at either end (the player adds the gaps)."""
    lead, trail = vl.TIGHT_TRIM if tight else vl.NORMAL_TRIM
    ff(["-i", str(in_wav), "-af", vl.silence_filter(lead, trail),
        "-ac", "1", "-ar", str(SAMPLE_RATE), "-b:a", "56k", str(out_mp3)])


def mp3_duration(p: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                         "-of", "csv=p=0", str(p)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


class QwenEngine:
    def __init__(self, model_dir: Path, ref_audio: Path, ref_text: str):
        if not ref_audio.exists():
            sys.exit(f"FATAL: reference wav not found: {ref_audio}")
        if not ref_text and ref_audio.with_suffix(".txt").exists():
            ref_text = ref_audio.with_suffix(".txt").read_text("utf-8").strip()
        if not ref_text:
            sys.exit("FATAL: need --ref-text or a .txt sibling of --ref-audio")
        from mlx_audio.tts.utils import load_model
        from mlx_audio.tts.generate import generate_audio
        print(f"  loading Qwen3-TTS clone model: {model_dir.name}")
        self.model = load_model(str(model_dir))
        self.gen = generate_audio
        self.ref_audio = ref_audio
        self.ref_text = ref_text

    def take(self, text: str, tmp_dir: Path, attempt: int) -> Path | str:
        import soundfile as sf
        for f in tmp_dir.glob("step_*.wav"):
            f.unlink()
        try:
            self.gen(text=text, model=self.model, ref_audio=str(self.ref_audio),
                    ref_text=self.ref_text, output_path=str(tmp_dir), file_prefix="step_",
                    audio_format="wav", temperature=0.7 + 0.1 * (attempt - 1),
                    verbose=False, play=False)
        except Exception:
            return "exception during synthesis"
        produced = sorted(tmp_dir.glob("step_*.wav"))
        if not produced:
            return "no wav produced"
        _ = sf  # soundfile used by caller for duration; keep import warm
        return produced[0]


class HiggsEngine:
    """Higgs Audio v2 3B via MLX (mlx-community q8) — zero-shot clone from a ref pair."""

    def __init__(self, model_id: str, ref_audio: Path, ref_text: str):
        if not ref_audio.exists():
            sys.exit(f"FATAL: reference wav not found: {ref_audio}")
        if not ref_text and ref_audio.with_suffix(".txt").exists():
            ref_text = ref_audio.with_suffix(".txt").read_text("utf-8").strip()
        if not ref_text:
            sys.exit("FATAL: need --ref-text or a .txt sibling of --ref-audio")
        import numpy as np
        from mlx_audio.tts.utils import load
        print(f"  loading Higgs v2 model: {model_id}")
        self.model = load(model_id)
        # generate() wants PCM float32 mono, not a path
        with tempfile.NamedTemporaryFile(suffix=".f32", delete=False) as tf:
            ff(["-i", str(ref_audio), "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "f32le", tf.name])
            self.ref = np.fromfile(tf.name, dtype=np.float32)
        self.ref_text = ref_text

    def take(self, text: str, tmp_dir: Path, attempt: int) -> Path | str:
        """One fresh sampling draw at a rotating temperature. This port has no
        seed control, but every generate() is a fresh lottery draw — word-skips
        (~2x in early batches) and rushes are beaten by retries gated in
        render_verified, not by temperature alone."""
        import soundfile as sf
        out = tmp_dir / f"h_{attempt}.wav"
        max_frames = int((len(text.split()) / WPS_EST * 2.4 + 2.0) * 25) + 50
        temp = (0.3, 0.5, 0.7, 0.85, 1.0)[(attempt - 1) % 5]
        try:
            for result in self.model.generate(
                    text=text, ref_audio=self.ref, ref_text=self.ref_text,
                    temperature=temp, top_p=0.95,
                    max_new_frames=max_frames, fade_in_ms=30.0):
                sf.write(str(out), result.audio, result.sample_rate)
                return out
        except Exception as e:
            return f"exception during synthesis at temp {temp}: {e}"
        return "no wav produced"


def split_sentences(text: str) -> list[str]:
    """Split narration text into render units — short inputs skip far less often
    than multi-sentence inputs on the Higgs MLX port (measured: per-draw
    word-skip rate ~50% on 20-40 word paragraphs, ~0% on single sentences).
    Long sentences (>14 words) are additionally split at comma/colon breath
    groups: those are the units that rush and drop list items, and the stitch
    pauses between groups are exactly the deliberate pacing we want for kids."""
    import re
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    out: list[str] = []
    for p in parts:
        if (len(p.split()) >= 10 or ":" in p) and re.search(r"[,:;]\s", p):
            # split down to breath groups; short units clone fine (verified on
            # 1-4 word inputs) and skipping concentrates in long list clauses
            subs = [s for s in re.split(r"(?<=[,:;])\s+", p) if s]
            out.extend(subs if len(subs) > 1 else [p])
        else:
            out.append(p)
    return out


def render_verified(engine, aligner, text: str, tmp_dir: Path,
                   max_attempts: int = 3, say: str | None = None,
                   post=None) -> tuple[Path, float]:
    """Synthesize, trim/loudnorm, and gate on three checks: duration window,
    independent-ASR word recovery >= 0.94 (catches truncation that forced
    alignment would mask), and spoken pace <= 210 wpm (approved-sample pace).
    Misses re-render at a hotter temperature; nothing bad ships.
    (Voice lines: `say` is what the model is given when a frame adds
    punctuation, `post` their post-processing; lessons pass neither.)"""
    words = len(text.split())
    lo, hi = duration_window(words)
    last = "?"
    for attempt in range(1, max_attempts + 1):
        raw = engine.take(say or text, tmp_dir, attempt)
        if isinstance(raw, str):
            last = raw
            continue
        out = tmp_dir / "verified.mp3"
        if out.exists():
            out.unlink()
        (post or postprocess)(raw, out)
        dur = mp3_duration(out)
        if not (lo <= dur <= hi):
            last = f"duration {dur:.1f}s outside [{lo:.1f},{hi:.1f}]s for {words}w"
            continue
        recovery, span_wpm = aligner.verify(out, text)
        if recovery < 0.94:
            last = f"word recovery {recovery:.2f} < 0.94 (truncated/mangled?)"
            continue
        # Standard: <=210 wpm, the observed pace of the owner-approved v2 A/B
        # samples (energetic-teacher). word-span based, so padding can't hide it.
        if span_wpm > 210:
            last = f"spoken {span_wpm:.0f} wpm > 210 (rushed)"
            continue
        return out, dur
    raise RuntimeError(f"synthesis failed after {max_attempts} attempts ({last})")


def render_verified_short(engine, aligner, text: str, tmp_dir: Path, say: str,
                          tight: bool, max_attempts: int = 5) -> tuple[Path, float]:
    """The gates for clips of <= 3 words (voice lines: "Great job!", "seven",
    "Tap the"): a short-clip duration window and Whisper must hear EXACTLY the
    clip's words in canonical form (voicelines.short_gate). Recovery ratios and
    pace mean nothing on one or two words, and a wrong word is the whole clip.
    Every attempt is a fresh draw at the next temperature."""
    last = "?"
    for attempt in range(1, max_attempts + 1):
        raw = engine.take(say, tmp_dir, attempt)
        if isinstance(raw, str):
            last = raw
            continue
        out = tmp_dir / "verified.mp3"
        if out.exists():
            out.unlink()
        postprocess_voice(raw, out, tight)
        dur = mp3_duration(out)
        why = vl.short_gate(text, aligner.transcribe(out), dur)
        if why:
            last = why
            continue
        return out, dur
    raise RuntimeError(f"short clip failed after {max_attempts} attempts ({last})")


def render_stitched(engine, aligner, text: str, tmp_dir: Path,
                    max_tries_per_sentence: int = 5) -> tuple[Path, float]:
    """Fallback for paragraphs the model keeps mangling as a whole: render each
    sentence separately (short inputs are far more reliable), gate each part,
    then stitch with short pauses and re-verify the whole clip. Returns
    (mp3, duration); raises if any sentence stays bad after its own retries."""
    import numpy as np
    import soundfile as sf
    sentences = split_sentences(text)
    if len(sentences) < 2:
        raise RuntimeError("single-sentence text; nothing to split")
    parts: list = []
    gap = np.zeros(int(24000 * 0.28), dtype=np.float32)
    for i, sent in enumerate(sentences):
        kept = None
        for attempt in range(1, max_tries_per_sentence + 1):
            try:
                raw = engine.take(sent, tmp_dir, attempt + i * 5)
                if isinstance(raw, str):
                    continue
                one = tmp_dir / f"sent_{i}_{attempt}.wav"
                if one.exists():
                    one.unlink()
                postprocess(raw, one)
                recovery, span_wpm = aligner.verify(one, sent)
            except Exception:
                continue  # transient decode/verify failure: next draw
            if recovery >= 0.94 and span_wpm <= 210:
                kept = one
                break
        if kept is None:
            raise RuntimeError(f"sentence {i+1}/{len(sentences)} failed: {sent!r}")
        audio, sr = sf.read(str(kept), dtype="float32")
        parts.append(audio)
        parts.append(gap)
    merged = np.concatenate(parts[:-1])  # drop trailing gap
    out_raw = tmp_dir / "stitched.wav"
    sf.write(str(out_raw), merged, sr)
    out = tmp_dir / "stitched.mp3"
    if out.exists():
        out.unlink()
    postprocess(out_raw, out)
    dur = mp3_duration(out)
    # Whole-clip re-verify: catches stitch/ordering bugs (a missing unit tanks
    # recovery below 0.90 at this clip size). Per-unit gating already enforced
    # 0.94 + pace on every part; re-transcribing seams adds Whisper noise, so
    # the whole-clip bar is deliberately looser than the per-part bar.
    recovery, span_wpm = aligner.verify(out, text)
    if recovery < 0.90:
        raise RuntimeError(f"stitched clip recovery {recovery:.2f} < 0.90")
    if span_wpm > 210:
        raise RuntimeError(f"stitched clip {span_wpm:.0f} wpm > 210")
    return out, dur


class WordAligner:
    """stable-ts forced alignment against the exact text (handoff §3.5).

    Also the ASR verifier: forced alignment happily fits the full text onto a
    TRUNCATED take, so content must be checked by independent transcription
    (WattMoth house rule: word recovery >= 94%)."""

    def __init__(self):
        import stable_whisper
        print("  loading stable-whisper for alignment…")
        self.model = stable_whisper.load_model("small.en")

    @staticmethod
    def _norm_words(s: str) -> list[str]:
        import re
        return [w for w in re.sub(r"[^a-z0-9' ]", " ", s.lower()).split() if w]

    def verify(self, mp3: Path, text: str) -> tuple[float, float]:
        """Transcribe the clip independently; return (word recovery, spoken wpm).
        Recovery compares in canonical numeric/math form (scripts spell numbers
        out; Whisper hears digits) — raw token diff flags fake truncations."""
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from textnorm import recovery as _recovery
        res = self.model.transcribe(str(mp3), word_timestamps=True)
        spoken = []
        for seg in res.segments:
            for w in seg.words:
                spoken.append((w.word.strip(), w.start, w.end))
        heard = " ".join(w for w, _, _ in spoken)
        rec = _recovery(text, heard)
        if spoken:
            span = spoken[-1][2] - spoken[0][1]
            if span >= 3.0:  # timing noise dominates shorter clips; skip pace
                wpm = len(heard.split()) / (span / 60.0)
            else:
                wpm = 120
        else:
            wpm = 0
        return rec, wpm

    def transcribe(self, mp3: Path) -> str:
        """What Whisper hears, as plain text (the short-clip gate)."""
        res = self.model.transcribe(str(mp3), word_timestamps=True)
        return " ".join(w.word.strip() for seg in res.segments for w in seg.words)

    def align(self, mp3: Path, text: str):
        res = self.model.align(str(mp3), text)
        words = []
        for seg in res.segments:
            for w in seg.words:
                words.append({"w": w.word.strip(), "s": round(max(0.0, w.start), 3),
                            "e": round(w.end, 3)})
        words.sort(key=lambda x: x["s"])
        fixed, prev = [], -1.0
        for w in words:
            if w["s"] < prev:
                w["s"] = prev
            if w["e"] < w["s"]:
                w["e"] = w["s"] + 0.05
            prev = w["s"]
            if w["w"]:
                fixed.append(w)
        return fixed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["qwen", "higgs"], default="higgs",
                    help="qwen = Qwen3-TTS clone; higgs = Higgs Audio v2 3B MLX clone")
    ap.add_argument("--model", default=None,
                    help="engine model: dir for qwen, HF repo id for higgs")
    ap.add_argument("--ref-audio", default=None,
                    help="reference wav for cloning (~12-15 s); required unless --dry-run")
    ap.add_argument("--ref-text", default="", help="exact transcript (or a .txt sibling)")
    ap.add_argument("--only", default=None, help="lessonId, lessonId/stepId, or comma-separated list "
                    "(--set voice: a clip key, pack, template or slot kind)")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--set", choices=["lessons", "voice"], default="lessons",
                    help="lessons = lesson narration (public/tts); voice = voice lines (public/voice)")
    ap.add_argument("--dry-run", action="store_true",
                    help="print the work list and exit (loads no models)")
    ap.add_argument("--slot-frame", default="{w}",
                    help="voice set: punctuation around slot words for the model, e.g. '{w},'")
    ap.add_argument("--piece-frame", default="{w}",
                    help="voice set: punctuation around carrier pieces that run into a slot, e.g. '{w}...'")
    args = ap.parse_args()
    if not args.dry_run and not args.ref_audio:
        ap.error("--ref-audio is required (or use --dry-run)")
    if args.set == "voice":
        return voice_main(args)

    default_models = {
        "qwen": str(Path.home() / "Projects/contentgen/qwen3-tts/models/Qwen3-TTS-12Hz-1.7B-Base-8bit"),
        "higgs": "mlx-community/higgs-audio-v2-3B-mlx-q8",
    }
    model = args.model or default_models[args.engine]

    voice = load_json(VOICEF)["voice"]
    narration = load_json(NARR)
    manifest = load_json(MANIFEST, default={})

    targets = []
    only = args.only.split(",") if args.only else None
    for lesson_id, steps in narration.items():
        for st in steps:
            key = f"{lesson_id}/{st['stepId']}"
            if only and not any(key == o or lesson_id == o for o in only):
                continue
            targets.append((key, st["text"]))

    if args.dry_run:
        todo = 0
        for key, text in targets:
            entry = manifest.get(key)
            ok = bool(not args.force and entry and entry.get("hash") == sha1_10(voice, text)
                      and (TTS_DIR / f"{key}.mp3").exists() and (TTS_DIR / f"{key}.words.json").exists())
            todo += 0 if ok else 1
            print(f"{'ok    ' if ok else 'render'} {key:<32} {len(text.split()):>3}w -> public/tts/{key}.mp3")
        print(f"dry run (lessons, voice {voice!r}): {todo} to render, {len(targets) - todo} up to date")
        if not targets:
            sys.exit("FATAL: nothing matched --only")
        return

    TTS_DIR.mkdir(parents=True, exist_ok=True)
    engine = None
    aligner = None
    done = skipped = failed = 0
    tmp_dir = Path(tempfile.mkdtemp(prefix="sq_tts_"))

    for key, text in targets:
        h = sha1_10(voice, text)
        mp3 = TTS_DIR / f"{key}.mp3"
        wordsf = TTS_DIR / f"{key}.words.json"
        entry = manifest.get(key)
        if (not args.force and entry and entry.get("hash") == h
                and mp3.exists() and wordsf.exists()):
            skipped += 1
            continue
        if engine is None:
            if args.engine == "higgs":
                engine = HiggsEngine(model, Path(args.ref_audio), args.ref_text)
            else:
                engine = QwenEngine(Path(model), Path(args.ref_audio), args.ref_text)
            aligner = WordAligner()
        try:
            verified, dur = render_verified(engine, aligner, text, tmp_dir)
        except RuntimeError as e:
            if args.engine != "higgs":
                print(f"FAILED {key}: {e}", flush=True)
                failed += 1
                continue
            print(f"  retry-stitched {key}: {e}", flush=True)
            try:
                verified, dur = render_stitched(engine, aligner, text, tmp_dir)
            except RuntimeError as e2:
                print(f"FAILED {key}: {e2}", flush=True)
                failed += 1
                continue
        mp3.parent.mkdir(parents=True, exist_ok=True)
        os.replace(verified, mp3)
        words = aligner.align(mp3, text)
        atomic_write(wordsf, json.dumps({"words": words}, ensure_ascii=False))
        manifest[key] = {"file": f"tts/{key}.mp3", "hash": h,
                        "duration": round(dur, 2), "words": f"tts/{key}.words.json"}
        ordered = {k: manifest[k] for k in sorted(manifest)}
        atomic_write(MANIFEST, json.dumps(ordered, indent=2) + "\n")
        print(f"wrote {key} {dur:.2f}s {len(words)} words")
        done += 1

    print(f"done: {done} rendered, {skipped} up-to-date, {failed} failed")
    if done == 0 and skipped == 0:
        sys.exit("FATAL: nothing matched --only")
    if failed:
        sys.exit(1)


def make_engine(args, model: str):
    if args.engine == "higgs":
        return HiggsEngine(model, Path(args.ref_audio), args.ref_text)
    return QwenEngine(Path(model), Path(args.ref_audio), args.ref_text)


def voice_main(args):
    """`--set voice`: render src/voice/voiceLines.json into public/voice.
    Idempotent and resumable exactly like the lesson set: a clip whose manifest
    hash matches and whose files exist is skipped; the manifest is rewritten
    atomically after every clip."""
    default_models = {
        "qwen": str(Path.home() / "Projects/contentgen/qwen3-tts/models/Qwen3-TTS-12Hz-1.7B-Base-8bit"),
        "higgs": "mlx-community/higgs-audio-v2-3B-mlx-q8",
    }
    model = args.model or default_models[args.engine]
    for frame in (args.slot_frame, args.piece_frame):
        problem = vl.check_frame(frame)
        if problem:
            sys.exit(f"FATAL: {problem}")
    voice = load_json(VOICE_ID)["voice"]
    catalog = load_json(VOICE_LINES)
    manifest = load_json(VOICE_MANIFEST, default={})
    only = args.only.split(",") if args.only else None
    try:
        targets = vl.load_targets(catalog, voice, only)
    except ValueError as e:
        sys.exit(f"FATAL: {e}")
    work = vl.work_list(targets, manifest, PUBLIC, args.force)

    if args.dry_run:
        for t, todo in work:
            print(vl.describe(t, todo, args.slot_frame, args.piece_frame))
        n = sum(1 for _, todo in work if todo)
        short = sum(1 for t, _ in work if vl.is_short(t["text"]))
        print(f"dry run (voice lines, voice {voice!r}): {n} to render, {len(work) - n} up to date ({short} short-gated)")
        if not work:
            sys.exit("FATAL: nothing matched --only")
        return

    engine = None
    aligner = None
    done = skipped = failed = 0
    tmp_dir = Path(tempfile.mkdtemp(prefix="sq_voice_"))
    for t, todo in work:
        key, text = t["key"], t["text"]
        if not todo:
            skipped += 1
            continue
        if engine is None:
            engine = make_engine(args, model)
            aligner = WordAligner()
        say = vl.prompt_text(t, args.slot_frame, args.piece_frame)
        tight = vl.tight(t)
        try:
            if vl.is_short(text):
                verified, dur = render_verified_short(engine, aligner, text, tmp_dir, say, tight)
            else:
                def post(i, o, tight=tight):
                    postprocess_voice(i, o, tight)
                try:
                    verified, dur = render_verified(engine, aligner, text, tmp_dir, say=say, post=post)
                except RuntimeError as e:
                    # the breath-group fallback, as for lessons; whole lines only (a
                    # stitched piece must stay one tight take)
                    if args.engine != "higgs" or tight:
                        raise
                    print(f"  retry-stitched {key}: {e}", flush=True)
                    verified, dur = render_stitched(engine, aligner, text, tmp_dir)
        except RuntimeError as e:
            print(f"FAILED {key}: {e}", flush=True)
            failed += 1
            continue
        mp3 = PUBLIC / t["file"]
        wordsf = PUBLIC / vl.words_file(t["file"])
        mp3.parent.mkdir(parents=True, exist_ok=True)
        os.replace(verified, mp3)
        words = aligner.align(mp3, text)
        atomic_write(wordsf, json.dumps({"words": words}, ensure_ascii=False))
        manifest[key] = {"file": t["file"], "hash": t["hash"],
                         "duration": round(dur, 2), "words": vl.words_file(t["file"])}
        ordered = {k: manifest[k] for k in sorted(manifest)}
        VOICE_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        atomic_write(VOICE_MANIFEST, json.dumps(ordered, indent=2) + "\n")
        print(f"wrote {key} {dur:.2f}s {len(words)} words")
        done += 1

    print(f"done: {done} rendered, {skipped} up-to-date, {failed} failed")
    if not work:
        sys.exit("FATAL: nothing matched --only")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
