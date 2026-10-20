/**
 * Voice lines: everything the app SAYS outside the lesson narration — screen
 * and game instructions, feedback, and spoken questions. All of it is
 * pre-recorded offline in the teacher voice (see docs/narration-handoff.md and
 * the K–5 plan §3); nothing is synthesized at runtime except as a fallback.
 *
 * Lines are authored in voice packs (`src/voice/packs/<pack>.ts`, one
 * `defineVoicePack` default export each; the registry discovers them), and
 * referenced everywhere else by a `VoiceRef`.
 */

/** A spoken line: a fixed catalog line, or a template filled with slot values. */
export type VoiceRef =
  /** `"<pack>/<lineId>"`, e.g. `"ui/tapToStart"`. */
  | { line: string }
  /** `"<pack>/<templateId>"` plus a value for every slot, e.g. `{ n: 7, thing: 'apples' }`. */
  | { template: string; slots: Record<string, string | number> }

/** The allowed values of one template slot. Numbers are spoken as words ("seven"). */
export type SlotSpec =
  | { numbers: readonly [min: number, max: number] }
  | { words: readonly string[] }

export interface TemplateDef {
  /** The line with `{slot}` placeholders, as shown in captions: "Tap the group with {n} {thing}." */
  text: string
  slots: Record<string, SlotSpec>
  /**
   * How it is recorded. `whole` (the default when the combinations are few,
   * about 200 or less): every filled-in sentence is its own clip, natural
   * prosody. `stitch`: the carrier pieces and the slot words are recorded
   * separately and played back to back.
   */
  render?: 'whole' | 'stitch'
}

export interface VoicePack {
  /** The pack id: the prefix of every line id in it ("ui", "k-math", "parade"). */
  id: string
  /** Fixed lines: id → exact text (the recording, the caption and the hash all use it verbatim). */
  lines: Record<string, string>
  templates?: Record<string, TemplateDef>
}

/** Identity helper so packs type-check as they are written. */
export function defineVoicePack<P extends VoicePack>(pack: P): P {
  return pack
}

/**
 * The timeline of whatever is being said, read every frame by anything that
 * animates in time with the voice (the guide's spotlight, `cue()` in scenes).
 * Same shape as the lesson `NarrationClock`.
 */
export interface VoiceClock {
  /** Seconds since the line started (keeps counting after it ends). */
  now(): number
  /** Best-known length of the line in seconds. */
  duration(): number
  /** Seconds at which character `i` of the line's text is spoken. */
  timeAtChar(i: number): number
}

export interface VoicePlayback {
  /** The resolved text of the current line ("" when none): captions, cue lookups. */
  text: string
  /** True while audio (or the fallback speech) is sounding. */
  playing: boolean
  clock: VoiceClock
  /** Say it again from the start (the 🔊 button). */
  replay(): void
  stop(): void
}
