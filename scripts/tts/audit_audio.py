#!/usr/bin/env python3
"""Independent QC of rendered clips (lessons and voice lines), separate from the
renderer's own gates: a different, larger ASR (MLX Whisper large-v3-turbo, not
the renderer's small.en) re-hears every fresh clip, and the decoded signal is
checked against the post-processing spec (handoff §3).

  python3 scripts/tts/audit_audio.py [--set lessons|voice|all] [--only pack,...] [--json out.json]

Needs `mlx_whisper` and numpy (the Mac's default python3 has both).

Per clip:
- content: long clips must recover >= 0.94 of the script (WARN 0.90-0.94: the
  stitched-clip bar), short clips (<= 3 words) must be heard exactly
  (voicelines.short_gate); letter-sound articulations can't be ASR-checked and
  are listed for listening instead;
- pace: <= 210 wpm over >= 3 s of speech;
- signal: sample peak <= -1 dBFS, leading silence <= 0.15 s (normal clips),
  active-speech RMS within 6 dB of the set's median (consistent loudness).
"""
from __future__ import annotations

import argparse, json, re, subprocess, sys
from pathlib import Path
from statistics import median

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import voicelines as vl  # noqa: E402
from textnorm import recovery  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
ASR = "mlx-community/whisper-large-v3-turbo"
SR = 16000


def decode(mp3: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(mp3), "-ac", "1",
                          "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def signal(a: np.ndarray) -> dict:
    if not len(a):
        return {"peak": -120.0, "lead": 0.0, "rms": -120.0}
    db = lambda x: 20 * np.log10(max(float(x), 1e-6))  # noqa: E731
    above = np.nonzero(np.abs(a) > 10 ** (-45 / 20))[0]
    lead = above[0] / SR if len(above) else len(a) / SR
    win = SR // 50  # 20 ms frames; speech = frames within 30 dB of the loudest
    frames = a[: len(a) // win * win].reshape(-1, win) if len(a) >= win else a.reshape(1, -1)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    active = rms[rms > rms.max() * 10 ** (-30 / 20)]
    return {"peak": round(db(np.abs(a).max()), 1), "lead": round(lead, 3),
            "rms": round(db(np.sqrt((active ** 2).mean())), 1)}


def targets(which: str, only: list[str] | None):
    if which in ("lessons", "all"):
        narr = json.loads((ROOT / "src/tutoring/narration.json").read_text())
        man = json.loads((PUBLIC / "tts/manifest.json").read_text())
        for lid, steps in narr.items():
            for s in steps:
                key = f"{lid}/{s['stepId']}"
                if key in man and (not only or lid in only or key in only):
                    yield "lessons", key, s["text"], PUBLIC / man[key]["file"], False
    if which in ("voice", "all"):
        cat = json.loads((ROOT / "src/voice/voiceLines.json").read_text())["clips"]
        man = json.loads((PUBLIC / "voice/manifest.json").read_text())
        for key, c in cat.items():
            m = man.get(key)
            if m and m["hash"] == c["hash"] and vl.matches_only(key, only):
                yield "voice", key, c["text"], PUBLIC / c["file"], vl.tight(c)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", choices=["lessons", "voice", "all"], default="all")
    ap.add_argument("--only", default=None)
    ap.add_argument("--json", default=None, help="write the full per-clip report here")
    args = ap.parse_args()
    import mlx_whisper

    rows = []
    for kind, key, text, mp3, tight in targets(args.set, args.only.split(",") if args.only else None):
        row = {"set": kind, "key": key, "text": text, "issues": [], "warn": []}
        if not mp3.exists():
            row["issues"].append("missing file")
            rows.append(row)
            continue
        a = decode(mp3)
        dur = len(a) / SR
        row.update(signal(a), dur=round(dur, 2))
        if row["peak"] > -1.0:
            row["issues"].append(f"peak {row['peak']} dBFS > -1")
        if not tight and row["lead"] > 0.15:
            row["warn"].append(f"leading silence {row['lead']:.2f}s > 0.15")
        if vl.is_articulation(text):
            row["listen"] = True  # ASR can't judge a letter sound
        else:
            r = mlx_whisper.transcribe(str(mp3), path_or_hf_repo=ASR, language="en",
                                       word_timestamps=True, condition_on_previous_text=False)
            words = [w for s in r["segments"] for w in s.get("words", [])]
            heard = " ".join(w["word"].strip() for w in words) or r["text"].strip()
            heard = re.sub(r"(^|\s)-(?=\w)", r"\1", heard)  # turbo writes "Three -fifths"
            row["heard"] = heard
            if vl.is_short(text):
                why = vl.short_gate(text, heard, dur)
                if why:
                    row["issues"].append(why)
            else:
                rec = recovery(text, heard)
                row["recovery"] = round(rec, 3)
                if rec < 0.90:
                    row["issues"].append(f"recovery {rec:.2f} < 0.90")
                elif rec < 0.94:
                    row["warn"].append(f"recovery {rec:.2f} < 0.94")
                span = (words[-1]["end"] - words[0]["start"]) if words else 0
                if span >= 3.0:
                    wpm = len(text.split()) / (span / 60)
                    row["wpm"] = round(wpm)
                    if wpm > 210:
                        row["issues"].append(f"{wpm:.0f} wpm > 210")
        rows.append(row)
        if row["issues"]:
            print(f"BAD  {key}: {'; '.join(row['issues'])}", flush=True)

    for kind in ("lessons", "voice"):
        rs = [r for r in rows if r["set"] == kind and "rms" in r]
        if not rs:
            continue
        med = median(r["rms"] for r in rs)
        for r in rs:
            if abs(r["rms"] - med) > 6:
                r["warn"].append(f"speech level {r['rms']} dBFS vs set median {med:.1f}")
        print(f"{kind}: {len(rs)} clips, speech level median {med:.1f} dBFS")

    bad = [r for r in rows if r["issues"]]
    warn = [r for r in rows if r["warn"] and not r["issues"]]
    listen = [r["key"] for r in rows if r.get("listen")]
    print(f"audited {len(rows)}: {len(bad)} bad, {len(warn)} warnings, {len(listen)} letter sounds to listen to")
    for r in warn:
        print(f"WARN {r['key']}: {'; '.join(r['warn'])}")
    if args.json:
        Path(args.json).write_text(json.dumps(rows, indent=1, ensure_ascii=False))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
