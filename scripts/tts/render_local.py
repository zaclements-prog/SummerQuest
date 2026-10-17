#!/usr/bin/env python3
"""Render SummerQuest lesson narration with a LOCAL TTS engine (docs/narration-handoff.md).

Setup (one time, on the machine with the models — the Mac):
  Venv:  ~/Projects/contentgen/qwen3-tts/.venv          (mlx_audio + torch)
  Models: ~/Projects/contentgen/qwen3-tts/models/Qwen3-TTS-12Hz-1.7B-Base-8bit
          ~/Projects/contentgen/qwen3-tts/models/Qwen3-TTS-12Hz-1.7B-VoiceDesign-8bit
  Ref pair: a ~12-15 s reference wav + its EXACT transcript .txt next to it.
            Produce it with VoiceDesign (design once) or record a voice.
  Extra pip deps in that venv: stable-ts (word alignment), soundfile, numpy
  ffmpeg must be on PATH.

Usage (from the repo root):
  ~/Projects/contentgen/qwen3-tts/.venv/bin/python3 scripts/tts/render_local.py \
      --engine qwen --ref-audio /path/teacher_ref.wav \
      [--model /path/Qwen3-TTS-12Hz-1.7B-Base-8bit] \
      [--only fractions] [--only fractions/parts] [--force]

Reads  src/tutoring/narration.json + src/tutoring/narrationVoice.json.
Writes public/tts/<lesson>/<step>.mp3 + .words.json, updates public/tts/manifest.json
atomically after every clip (resumable). Idempotent: a step whose manifest hash
already matches the current voice|text and whose files exist is skipped (use --force).
Exit code non-zero on any failure.
"""
from __future__ import annotations

import argparse, hashlib, json, os, subprocess, sys, tempfile, time
from pathlib import Path

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

REPO = Path(__file__).resolve().parents[2]
NARR = REPO / "src/tutoring/narration.json"
VOICEF = REPO / "src/tutoring/narrationVoice.json"
TTS_DIR = REPO / "public/tts"
MANIFEST = TTS_DIR / "manifest.json"
SAMPLE_RATE = 24000
WPS_EST = 2.6  # rough words-per-second for teacher pace, for sanity windows


def sha1_10(voice: str, text: str) -> str:
    return hashlib.sha1(f"{voice}|{text}".encode("utf-8")).hexdigest()[:10]


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

    def render(self, text: str, tmp_dir: Path) -> tuple[Path, float]:
        import soundfile as sf
        words = len(text.split())
        lo = max(0.6, words / WPS_EST * 0.45)
        hi = words / WPS_EST * 2.4 + 2.0
        last = None
        for attempt in range(1, 4):
            for f in tmp_dir.glob("step_*.wav"):
                f.unlink()
            try:
                self.gen(text=text, model=self.model, ref_audio=str(self.ref_audio),
                        ref_text=self.ref_text, output_path=str(tmp_dir), file_prefix="step_",
                        audio_format="wav", temperature=0.7 + 0.1 * (attempt - 1),
                        verbose=False, play=False)
            except Exception as e:  # retryable
                last = f"exception: {e}"
                continue
            produced = sorted(tmp_dir.glob("step_*.wav"))
            if not produced:
                last = "no wav produced"
                continue
            dur = sf.info(produced[0]).duration
            if dur < lo or dur > hi:
                last = f"duration {dur:.1f}s outside [{lo:.1f},{hi:.1f}]s for {words}w"
                continue
            return produced[0], dur
        sys.exit(f"FATAL: synthesis failed after 3 attempts ({last})")


class WordAligner:
    """stable-ts forced alignment against the exact text (handoff §3.5)."""

    def __init__(self):
        import stable_whisper
        print("  loading stable-whisper for alignment…")
        self.model = stable_whisper.load_model("small.en")

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
    ap.add_argument("--engine", choices=["qwen"], default="qwen",
                    help="higgs runs on the Omen via WattMoth tooling; not wired here")
    ap.add_argument("--model", default=str(Path.home() / "Projects/contentgen/qwen3-tts/models/Qwen3-TTS-12Hz-1.7B-Base-8bit"))
    ap.add_argument("--ref-audio", required=True, help="reference wav for cloning (~12-15 s)")
    ap.add_argument("--ref-text", default="", help="exact transcript (or a .txt sibling)")
    ap.add_argument("--only", default=None, help="lessonId or lessonId/stepId")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    voice = load_json(VOICEF)["voice"]
    narration = load_json(NARR)
    manifest = load_json(MANIFEST, default={})

    targets = []
    for lesson_id, steps in narration.items():
        for st in steps:
            key = f"{lesson_id}/{st['stepId']}"
            if args.only and not (key == args.only or lesson_id == args.only):
                continue
            targets.append((key, st["text"]))

    TTS_DIR.mkdir(parents=True, exist_ok=True)
    engine = None
    aligner = None
    done = skipped = 0
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
            engine = QwenEngine(Path(args.model), Path(args.ref_audio), args.ref_text)
            aligner = WordAligner()
        raw_wav, _ = engine.render(text, tmp_dir)
        mp3.parent.mkdir(parents=True, exist_ok=True)
        postprocess(raw_wav, mp3)
        dur = mp3_duration(mp3)
        words = aligner.align(mp3, text)
        atomic_write(wordsf, json.dumps({"words": words}, ensure_ascii=False))
        manifest[key] = {"file": f"tts/{key}.mp3", "hash": h,
                        "duration": round(dur, 2), "words": f"tts/{key}.words.json"}
        ordered = {k: manifest[k] for k in sorted(manifest)}
        atomic_write(MANIFEST, json.dumps(ordered, indent=2) + "\n")
        print(f"wrote {key} {dur:.2f}s {len(words)} words")
        done += 1

    print(f"done: {done} rendered, {skipped} up-to-date")
    if done == 0 and skipped == 0:
        sys.exit("FATAL: nothing matched --only")


if __name__ == "__main__":
    main()
