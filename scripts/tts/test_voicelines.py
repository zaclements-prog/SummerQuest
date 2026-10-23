"""Unit tests for the voice-line renderer rules (no TTS/ASR models needed):

    python3 -m unittest discover -s scripts/tts

The end-to-end test of `render_local.py --set voice` uses a fake engine and a
fake Whisper, and needs ffmpeg/ffprobe on PATH (skipped otherwise).
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
import sys
import tempfile
import unittest
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import render_local as rl  # noqa: E402  (no heavy imports at module level)
import voicelines as vl  # noqa: E402
from textnorm import normalize, recovery  # noqa: E402

REPO = HERE.parents[1]


class Rules(unittest.TestCase):
    def test_hash_matches_the_catalog(self):
        voice = json.loads((REPO / "src/voice/voiceId.json").read_text())["voice"]
        catalog = json.loads((REPO / "src/voice/voiceLines.json").read_text())
        self.assertEqual(catalog["voice"], voice)
        for key, c in catalog["clips"].items():
            self.assertEqual(c["hash"], vl.sha1_10(voice, c["text"]), key)
        self.assertEqual(vl.sha1_10(voice, "x"), rl.sha1_10(voice, "x"))

    def test_number_words_from_the_app_read_back_as_numbers(self):
        # src/voice/spoken.ts spells numbers this way; Whisper writes digits
        for words, n in [("seven", 7), ("twenty-one", 21), ("one hundred five", 105),
                         ("one hundred twenty", 120), ("one thousand two hundred", 1200)]:
            self.assertEqual(normalize(words), [str(n)], words)

    def test_spelled_vs_heard_recovery_battery(self):
        # Every pair is a script line and a real Whisper transcript of correct
        # audio that the naive normalizer wrongly failed (g5 Decimals/Division,
        # g1 teens, K count-by lists, fractions, homophones).
        pairs = [
            ("Read three point four seven two as three and four hundred seventy-two thousandths.",
             "Read 3 .472 as 3 and 472 thousandths."),
            ("zero point five or zero point four five?", "0 .5 or 0 .45."),
            ("four point five plus two point three seven is six point eight seven.",
             "4 .5 plus 2 .37 is 6 .87."),
            ("So six times ten to the third power is six thousand.",
             "So, 6 times 10 to the third power is 6000."),
            ("Let's divide six hundred seventy-two by twenty-eight.",
             "Let's divide 672 by 28."),
            ("and thirty fits in sixty-seven two times.", "and 30 fits in 67 two times."),
            ("Twenty-eight fits in one hundred twelve four times,", "28 fits in 112, four times."),
            ("Ten, twenty, thirty.", "10. 20. 30."),
            ("Ten and three is thirteen!", "10 and 3 is 13."),
            ("Count by tens: ten, twenty, thirty, forty.", "Count by tens. 10, 20, 30, 40."),
            ("Bear has nine pears.", "Bear has nine pairs."),
            ("one third plus one third equals two thirds", "1/3 + 1/3 = 2/3"),
            ("What is six hundred forty-three minus two hundred eighty-six?",
             "What is 643 minus 286?"),
            ("one half", "1/2"),
            ("twenty-four equals six times four", "24 = 6 x 4"),
        ]
        for script, heard in pairs:
            r = recovery(script, heard)
            self.assertGreaterEqual(r, 0.94, f"{script!r} vs {heard!r}: {r:.2f}")

    def test_real_truncations_still_fail(self):
        # the folds must not paper over genuine dropped content
        self.assertLess(recovery("Count by tens: ten, twenty, thirty, forty.", "Count by tens."), 0.94)
        self.assertLess(recovery("Bear has nine pears and four plums.", "Bear has nine pairs."), 0.94)

    def test_articulation_detection(self):
        self.assertTrue(vl.is_articulation("Kuh… aa… tuh."))
        self.assertTrue(vl.is_articulation("sss..."))
        self.assertFalse(vl.is_articulation("Cat starts with kuh."))

    def test_short_clips(self):
        self.assertTrue(vl.is_short("Great job!"))
        self.assertTrue(vl.is_short("Tap the star"))
        self.assertFalse(vl.is_short("Tap the star now"))
        lo, hi = vl.short_duration_window(1)
        self.assertLess(lo, 0.4)
        self.assertGreater(hi, 1.5)

    def test_short_gate_wants_exact_words(self):
        self.assertIsNone(vl.short_gate("seven", "7.", 0.6))
        self.assertIsNone(vl.short_gate("Great job!", " great job.", 0.9))
        self.assertIsNone(vl.short_gate("twenty-one", "21", 0.8))
        self.assertIn("heard", vl.short_gate("seven", "seventy", 0.6))
        self.assertIn("heard", vl.short_gate("Great job!", "Great.", 0.9))
        self.assertIn("heard", vl.short_gate("seven", "", 0.6))
        self.assertIn("duration", vl.short_gate("seven", "seven", 0.1))
        self.assertIn("duration", vl.short_gate("seven", "seven", 6.0))

    def test_prompt_frames_only_touch_stitched_clips(self):
        slot = {"kind": "slot", "text": "seven"}
        piece = {"kind": "piece", "text": "Tap the group with"}
        last = {"kind": "piece", "text": "do you see?"}
        line = {"kind": "line", "text": "Great job!"}
        self.assertEqual(vl.prompt_text(slot, "{w},"), "seven,")
        self.assertEqual(vl.prompt_text(piece, "{w},", "{w}..."), "Tap the group with...")
        self.assertEqual(vl.prompt_text(last, "{w},", "{w}..."), "do you see?")
        self.assertEqual(vl.prompt_text(line, "{w},", "{w}..."), "Great job!")
        self.assertIsNone(vl.check_frame("{w},"))
        self.assertIsNone(vl.check_frame("{w}..."))
        self.assertIsNotNone(vl.check_frame("number {w}"))
        self.assertIsNotNone(vl.check_frame("seven"))

    def test_trim_filter_keeps_the_lesson_chain(self):
        lesson = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,"
                  "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.25,areverse,"
                  "loudnorm=I=-16:TP=-1.5:LRA=11")
        self.assertEqual(vl.silence_filter(*vl.NORMAL_TRIM), lesson)
        self.assertIn("start_silence=0.02", vl.silence_filter(*vl.TIGHT_TRIM))
        self.assertTrue(vl.tight({"kind": "slot"}) and vl.tight({"kind": "piece"}))
        self.assertFalse(vl.tight({"kind": "line"}) or vl.tight({"kind": "whole"}))

    def test_only_filters_by_key_pack_template_or_slot_kind(self):
        self.assertTrue(vl.matches_only("ui/greatJob", ["ui"]))
        self.assertTrue(vl.matches_only("k-math/tapGroupWith#0", ["k-math/tapGroupWith"]))
        self.assertTrue(vl.matches_only("k-math/tapGroupWith/n=7,thing=apples", ["k-math/tapGroupWith"]))
        self.assertTrue(vl.matches_only("slots/number/7", ["slots/number"]))
        self.assertFalse(vl.matches_only("slots/word/seven", ["slots/number"]))
        self.assertFalse(vl.matches_only("k-math/tapGroupWithout", ["k-math/tapGroupWith"]))
        self.assertTrue(vl.matches_only("anything", None))

    def test_targets_refuse_a_stale_catalog(self):
        cat = {"voice": "v", "clips": {"ui/a": {"text": "Hi!", "hash": vl.sha1_10("v", "Hi!"), "kind": "line",
                                                 "file": "voice/ui/a.mp3"}}}
        self.assertEqual([t["key"] for t in vl.load_targets(cat, "v", None)], ["ui/a"])
        with self.assertRaises(ValueError):
            vl.load_targets(cat, "other-voice", None)
        cat["clips"]["ui/a"]["text"] = "Hello!"
        with self.assertRaises(ValueError):
            vl.load_targets(cat, "v", None)

    def test_work_list_and_dry_run_lines(self):
        with tempfile.TemporaryDirectory() as d:
            pub = Path(d)
            t = {"key": "slots/number/7", "text": "seven", "hash": "h", "kind": "slot",
                 "file": "voice/slots/number/7.mp3"}
            self.assertEqual(vl.work_list([t], {}, pub, False), [(t, True)])
            (pub / "voice/slots/number").mkdir(parents=True)
            (pub / "voice/slots/number/7.mp3").write_bytes(b"x")
            (pub / "voice/slots/number/7.words.json").write_text("{}")
            man = {"slots/number/7": {"hash": "h"}}
            self.assertEqual(vl.work_list([t], man, pub, False), [(t, False)])
            self.assertEqual(vl.work_list([t], man, pub, True), [(t, True)])
            line = vl.describe(t, True, "{w},")
            for part in ("render", "slots/number/7", "gate=short", "trim=tight", "say 'seven,'"):
                self.assertIn(part, line)


def _tone_wav(path: Path, seconds: float):
    rate = 24000
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        for i in range(int(rate * seconds)):
            v = int(8000 * math.sin(2 * math.pi * 220 * i / rate))
            frames += v.to_bytes(2, "little", signed=True)
        w.writeframes(bytes(frames))


class FakeEngine:
    def __init__(self):
        self.said: list[str] = []

    def take(self, text, tmp_dir, attempt):
        self.said.append(text)
        out = Path(tmp_dir) / f"fake_{attempt}.wav"
        _tone_wav(out, 0.35 * len(text.split()) + 0.2)
        return out


class FakeWhisper:
    """Hears exactly the script (minus a stray word on demand)."""

    def __init__(self):
        self.current = ""
        self.mishear = set()

    def transcribe(self, mp3):
        return "mumble" if self.current in self.mishear else self.current

    def verify(self, mp3, text):
        return (1.0, 150.0)

    def align(self, mp3, text):
        out, t = [], 0.0
        for w in text.split():
            out.append({"w": w, "s": round(t, 3), "e": round(t + 0.3, 3)})
            t += 0.35
        return out


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "needs ffmpeg/ffprobe")
class VoiceSetEndToEnd(unittest.TestCase):
    def test_renders_writes_the_manifest_and_skips_up_to_date_clips(self):
        voice = "test-voice"
        clips = {
            "ui/greatJob": "Great job!",
            "ui/tapToStart": "Tap the star to start!",
            "k-math/tapGroupWith#0": "Tap the group with",
            "slots/number/7": "seven",
        }
        kinds = {"ui/greatJob": "line", "ui/tapToStart": "line", "k-math/tapGroupWith#0": "piece",
                 "slots/number/7": "slot"}
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "src/voice").mkdir(parents=True)
            (root / "src/voice/voiceId.json").write_text(json.dumps({"voice": voice}))
            catalog = {"voice": voice, "clips": {
                k: {"text": t, "hash": vl.sha1_10(voice, t), "kind": kinds[k],
                    "file": f"voice/{k.replace('#', '.part')}.mp3"} for k, t in clips.items()}}
            (root / "src/voice/voiceLines.json").write_text(json.dumps(catalog))
            saved = (rl.PUBLIC, rl.VOICE_LINES, rl.VOICE_ID, rl.VOICE_MANIFEST, rl.make_engine, rl.WordAligner)
            engine = FakeEngine()
            whisper = FakeWhisper()
            orig_take = engine.take

            def take(text, tmp_dir, attempt):
                whisper.current = text.rstrip(",")
                return orig_take(text, tmp_dir, attempt)
            engine.take = take
            try:
                rl.PUBLIC = root / "public"
                rl.VOICE_LINES = root / "src/voice/voiceLines.json"
                rl.VOICE_ID = root / "src/voice/voiceId.json"
                rl.VOICE_MANIFEST = root / "public/voice/manifest.json"
                rl.make_engine = lambda args, model: engine
                rl.WordAligner = lambda: whisper
                args = argparse.Namespace(engine="higgs", model=None, ref_audio="ref.wav", ref_text="",
                                          only=None, force=False, set="voice", dry_run=False,
                                          slot_frame="{w},", piece_frame="{w}")
                rl.voice_main(args)
                man = json.loads(rl.VOICE_MANIFEST.read_text())
                self.assertEqual(sorted(man), sorted(clips))
                for k, entry in man.items():
                    self.assertEqual(entry["hash"], vl.sha1_10(voice, clips[k]))
                    self.assertTrue((root / "public" / entry["file"]).exists(), k)
                    self.assertTrue((root / "public" / entry["words"]).exists(), k)
                    self.assertGreater(entry["duration"], 0)
                self.assertEqual(man["k-math/tapGroupWith#0"]["file"], "voice/k-math/tapGroupWith.part0.mp3")
                self.assertIn("seven,", engine.said)  # the slot frame reached the model
                # idempotent: nothing left to do
                n = len(engine.said)
                rl.voice_main(args)
                self.assertEqual(len(engine.said), n)
                # a short clip Whisper mishears is never shipped
                whisper.mishear = {"Great job!"}
                args.force = True
                args.only = "ui/greatJob"
                with self.assertRaises(SystemExit):
                    rl.voice_main(args)
            finally:
                (rl.PUBLIC, rl.VOICE_LINES, rl.VOICE_ID, rl.VOICE_MANIFEST, rl.make_engine, rl.WordAligner) = saved


if __name__ == "__main__":
    unittest.main()
