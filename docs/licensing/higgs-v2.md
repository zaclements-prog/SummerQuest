# Third-party model attribution — Higgs Audio v2

Lesson narration audio in this app is synthesized with **Higgs Audio v2**
(`bosonai/higgs-audio-v2-generation-3B-base`, MLX q8 re-host
`mlx-community/higgs-audio-v2-3B-mlx-q8`), used under the **Boson Higgs
Audio 2 Community License** (full text: `higgs-audio-v2-LICENSE.txt`, next
to this file). The model itself is **not** shipped in the app bundle — only
offline-rendered MP3/word-timing assets in `public/tts/`.

## Required notices

1. **In-app (About/credits, shown to users):**

   > Built with Higgs Materials licensed from Boson AI USA, Inc., Copyright
   > Boson AI USA, Inc., All Rights Reserved and Meta Llama 3 licensed under
   > the Meta Llama 3 Community License, Copyright Meta Platforms, Inc., All
   > Rights Reserved, based on Meta Llama 3.

2. **Distribution (`NOTICE` file shipped in the repo/package):**

   > Boson Higgs Audio 2 is licensed under the Boson Higgs Audio 2 Community
   > License Agreement, Copyright Boson AI USA, Inc., All Rights Reserved.
   > Higgs Audio v2 is based on Meta Llama 3, licensed under the Meta Llama 3
   > Community License, Copyright Meta Platforms, Inc.

3. **Store listing description (recommended):** include the same "Built with
   Higgs … / Meta Llama 3" sentence.

## Usage terms relevant to this project

- Commercial use permitted; expanded license from Boson AI required only past
  **100,000 annual active users** (Section 2 of the license).
- Voice-cloning consent: our narration reference is a synthetic voice created
  with Qwen3-TTS VoiceDesign (Apache-2.0), not a recording of any real
  person — no third-party voice rights implicated.
- Audio output ownership: outputs belong to the licensee per the license;
  clips are committed to this repo as project assets.

## Provenance

- Voice persona: synthetic design "calm-teacher-v1" — Qwen3-TTS 1.7B
  VoiceDesign (Apache-2.0), owner-approved 2026-10-18; reference pair
  banked off-repo at `~/Projects/contentgen/qwen3-tts/refs/sq_teacher_v2.{wav,txt}`.
- Rendering: `scripts/tts/render_local.py --engine higgs` (local MLX, offline).
- Previous engine (Apache-only, kept in git history): `qwen3-tts-1.7b:clone:calm-teacher-v1`.
