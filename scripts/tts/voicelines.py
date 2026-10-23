"""Voice-line rendering rules for render_local.py (`--set voice`), kept free of
the heavy TTS/ASR imports so they can be unit-tested with plain
`python3 -m unittest discover -s scripts/tts` (see test_voicelines.py).

The catalog (`src/voice/voiceLines.json`, from `npm run voice:dump`) lists every
clip: fixed lines, every combination of `whole` templates, the carrier pieces of
`stitch` templates and the shared slot values (numbers and words). See
docs/narration-handoff.md, "Voice lines".
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

_HERE = str(Path(__file__).resolve().parent)
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from textnorm import normalize  # noqa: E402  (pure: no heavy deps)

# Clips of this many words or fewer get the short-clip gates (exact words, a
# tight duration window): Whisper's recovery ratio and the pace check mean
# little on one or two words, and a wrong word there is the whole clip.
SHORT_MAX_WORDS = 3

# ffmpeg silence trimming (seconds of silence KEPT at each end). Lesson clips
# and whole voice lines use the lesson values; stitched pieces and slot words
# are played back to back, so they keep almost none (the player adds the gaps).
NORMAL_TRIM = (0.12, 0.25)
TIGHT_TRIM = (0.02, 0.04)


def sha1_10(voice: str, text: str) -> str:
    return hashlib.sha1(f"{voice}|{text}".encode("utf-8")).hexdigest()[:10]


def word_count(text: str) -> int:
    return len(text.split())


def is_short(text: str) -> bool:
    return word_count(text) <= SHORT_MAX_WORDS


def short_duration_window(words: int) -> tuple[float, float]:
    """Raw-length window for a 1-3 word clip after trimming. The floor catches
    clipped or empty takes; the cap catches v2's missing-stop-token runaway
    and long trailing breaths (K delivery is ~2 words/s, plus expression)."""
    words = max(1, words)
    return 0.25 * words, 1.2 + 0.8 * words


def short_gate(text: str, heard: str, duration: float) -> str | None:
    """Why a short take fails, or None when it passes: the duration window and
    an EXACT match of the canonical words (textnorm: numbers as digits, case
    and punctuation ignored) between the script and what Whisper heard."""
    lo, hi = short_duration_window(word_count(text))
    if not (lo <= duration <= hi):
        return f"duration {duration:.2f}s outside [{lo:.2f},{hi:.2f}]s for {word_count(text)}w"
    want, got = normalize(text), normalize(heard)
    if want != got:
        return f"heard {' '.join(got) or '(nothing)'!r}, want {' '.join(want)!r}"
    return None


def ends_sentence(text: str) -> bool:
    return bool(re.search(r"[.!?][\"”’')]*$", text.strip()))


def is_articulation(text: str) -> bool:
    """Letter-sound articulations ("Kuh… aa… tuh.", "sss") — the script spells
    the SOUND, not a word. ASR transcription cannot gate these; they ship on
    the duration window + human sampling (handoff §7.6 note 4)."""
    return "…" in text or "..." in text


def prompt_text(entry: dict, slot_frame: str = "{w}", piece_frame: str = "{w}") -> str:
    """What the TTS model is given for a clip. Usually the clip text verbatim;
    for stitched clips the owner may add punctuation (never words) to steer the
    intonation: a slot value read like a list item ("seven," with
    `--slot-frame '{w},'`), a piece that continues into a slot without a final
    fall (`--piece-frame '{w}…'`). The gates and the word timings always use
    the clip text itself, and so does the hash."""
    text = entry["text"]
    if entry.get("kind") == "slot":
        return slot_frame.format(w=text)
    if entry.get("kind") == "piece" and not ends_sentence(text):
        return piece_frame.format(w=text)
    return text


def check_frame(frame: str) -> str | None:
    """A frame may only add punctuation around the clip text: anything else
    would put words in the recording that the caption doesn't show."""
    if "{w}" not in frame:
        return f"frame {frame!r} must contain {{w}}"
    probe = "seven apples"
    if normalize(frame.format(w=probe)) != normalize(probe):
        return f"frame {frame!r} adds words; only punctuation is allowed"
    return None


def tight(entry: dict) -> bool:
    """Stitched segments (carrier pieces, slot values) are trimmed close."""
    return entry.get("kind") in ("piece", "slot")


def silence_filter(lead: float, trail: float) -> str:
    """The ffmpeg -af chain of handoff §3: trim to `lead`/`trail` s of silence, loudnorm."""
    return (f"silenceremove=start_periods=1:start_threshold=-45dB:start_silence={lead:g},"
            f"areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence={trail:g},areverse,"
            "loudnorm=I=-16:TP=-1.5:LRA=11")


def words_file(file: str) -> str:
    return re.sub(r"\.mp3$", ".words.json", file)


def matches_only(key: str, only: list[str] | None) -> bool:
    """`--only` for voice clips: an exact key, a pack ("ui", "slots"), a template
    ("k-math/tapGroupWith": its combos or pieces) or a slot kind ("slots/number")."""
    if not only:
        return True
    return any(key == o or key.startswith(o + "/") or key.startswith(o + "#") for o in only)


def load_targets(catalog: dict, voice: str, only: list[str] | None) -> list[dict]:
    """The catalog's clips (filtered by --only), checked against the voice id.
    Raises ValueError when voiceLines.json is out of date."""
    if catalog.get("voice") != voice:
        raise ValueError(f"voiceLines.json is for voice {catalog.get('voice')!r} but voiceId.json says {voice!r}: "
                         "run npm run voice:dump")
    out = []
    for key, c in catalog.get("clips", {}).items():
        if c.get("hash") != sha1_10(voice, c["text"]):
            raise ValueError(f"voiceLines.json is out of date at {key}: run npm run voice:dump")
        if matches_only(key, only):
            out.append({"key": key, **c})
    return out


def up_to_date(entry: dict | None, h: str, mp3: Path, wordsf: Path) -> bool:
    return bool(entry and entry.get("hash") == h and mp3.exists() and wordsf.exists())


def work_list(targets: list[dict], manifest: dict, public: Path, force: bool) -> list[tuple[dict, bool]]:
    """(clip, needs rendering) for every target, in catalog order."""
    out = []
    for t in targets:
        mp3 = public / t["file"]
        todo = force or not up_to_date(manifest.get(t["key"]), t["hash"], mp3, public / words_file(t["file"]))
        out.append((t, todo))
    return out


def describe(t: dict, todo: bool, slot_frame: str = "{w}", piece_frame: str = "{w}") -> str:
    """One dry-run line."""
    gate = "short" if is_short(t["text"]) else "normal"
    trim = "tight" if tight(t) else "normal"
    say = prompt_text(t, slot_frame, piece_frame)
    said = "" if say == t["text"] else f"  say {say!r}"
    status = "render" if todo else "ok    "
    return (f"{status} {t['key']:<44} {t['kind']:<5} {word_count(t['text']):>2}w gate={gate:<6} trim={trim:<6} "
            f"{t['text']!r}{said} -> public/{t['file']}")
