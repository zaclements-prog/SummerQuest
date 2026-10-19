import type { SlotSpec, TemplateDef, VoicePack } from './types'
import { numberWords, MAX_SPOKEN_NUMBER } from './spoken'

/**
 * The voice-line CLIP CATALOG: which recordings exist for the packs, what each
 * one says, and how a line or a filled-in template is played from them. Pure
 * (no import.meta.glob), so `npm run voice:dump` (node + tsx), the tests and
 * the player all share it. See docs/narration-handoff.md, "Voice lines".
 *
 * Clip keys (also their paths under public/voice, so they stay filesystem-safe):
 *
 * | What                         | Key                                      | Says                         |
 * |------------------------------|------------------------------------------|------------------------------|
 * | fixed line                   | `ui/tapToStart`                          | the line, verbatim           |
 * | `whole` template, per combo  | `k-math/tapGroupWith/n=7,thing=apples`   | the sentence, numbers as words |
 * | `stitch` template carrier    | `k-math/tapGroupWith#0` (piece index)    | the words between two slots  |
 * | slot value (shared by packs) | `slots/number/7`, `slots/word/apples`    | "seven", "apples"            |
 *
 * A key maps to `voice/<key>.mp3` with `#` written as `.part` (a `#` would end
 * the URL), e.g. `voice/k-math/tapGroupWith.part0.mp3`.
 */

/** A template without `render` is recorded whole up to this many combinations, stitched above. */
export const WHOLE_AUTO_MAX = 200
/** An explicit `render: 'whole'` may not go past this: switch it to `stitch`. */
export const WHOLE_MAX = 400
/** The pseudo-pack that holds the slot-value clips every stitched template shares. */
export const SLOT_PACK = 'slots'

/** Silence before a stitched segment, by what the caption has between it and the one before. */
export const GAP = { tight: 0.05, comma: 0.18, sentence: 0.35 } as const

export type ClipKind = 'line' | 'whole' | 'piece' | 'slot'

export interface CatalogClip {
  /** Exactly what the recording says (and what its hash covers). */
  text: string
  /** First 10 hex of SHA-1 of `${voice}|${text}`. */
  hash: string
  kind: ClipKind
  /** Where the MP3 lives, relative to public/ (its words file sits next to it). */
  file: string
}

/** `src/voice/voiceLines.json`: every clip to render for the current packs. */
export interface VoiceCatalog {
  voice: string
  clips: Record<string, CatalogClip>
}

/** One piece of what the player plays for a line: a clip, the caption characters it says, and the pause before it. */
export interface PlanSegment {
  key: string
  /** What the clip says (numbers as words): the device-speech fallback reads the caption instead. */
  text: string
  /** The caption characters this clip speaks: `caption.slice(capStart, capEnd)`. */
  capStart: number
  capEnd: number
  /** Seconds of silence before it (0 for the first). */
  gap: number
}

const PACK_ID = /^[a-z0-9][a-z0-9-]*$/
const ITEM_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const SLOT_NAME = /^\w+$/
const PLACEHOLDER = /\{(\w+)\}/g

export function clipFile(key: string): string {
  return `voice/${key.replace('#', '.part')}.mp3`
}

export function wordsFileOf(file: string): string {
  return file.replace(/\.mp3$/, '.words.json')
}

/** A slot word as a file-name part: "ice cream" → "ice-cream". */
export function slugWord(w: string): string {
  const s = w
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!s) throw new Error(`slot word ${JSON.stringify(w)} has no letters or digits to name its clip`)
  return s
}

export function slotValues(spec: SlotSpec): (string | number)[] {
  if ('numbers' in spec) {
    const out: number[] = []
    for (let n = spec.numbers[0]; n <= spec.numbers[1]; n++) out.push(n)
    return out
  }
  return [...spec.words]
}

/** How a slot value appears in a whole-template key (`n=7`, `thing=ice-cream`). */
function valueKey(spec: SlotSpec, v: string | number): string {
  return 'numbers' in spec ? String(v) : slugWord(String(v))
}

/** What a slot value sounds like: numbers as words, words as written. */
export function slotSpoken(spec: SlotSpec, v: string | number): string {
  return 'numbers' in spec ? numberWords(Number(v)) : String(v)
}

/** The shared clip of one slot value. */
export function slotClipKey(spec: SlotSpec, v: string | number): string {
  return 'numbers' in spec ? `${SLOT_PACK}/number/${v}` : `${SLOT_PACK}/word/${slugWord(String(v))}`
}

/** The slot names of a template, in the order they appear in its text (repeats included). */
export function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1])
}

export function comboCount(def: TemplateDef): number {
  return Object.values(def.slots).reduce((n, spec) => n * slotValues(spec).length, 1)
}

/** `whole` or `stitch`, with the default (`whole` up to WHOLE_AUTO_MAX combinations). */
export function renderMode(def: TemplateDef): 'whole' | 'stitch' {
  return def.render ?? (comboCount(def) <= WHOLE_AUTO_MAX ? 'whole' : 'stitch')
}

/** The clip key of one whole-template combination: slots in name order. */
export function wholeKey(templateId: string, def: TemplateDef, slots: Record<string, string | number>): string {
  const parts = Object.keys(def.slots)
    .sort()
    .map((name) => `${name}=${valueKey(def.slots[name], slots[name])}`)
  return `${templateId}/${parts.join(',')}`
}

/** The template filled the way it is SAID (numbers as words). */
export function spokenFill(def: TemplateDef, slots: Record<string, string | number>): string {
  return def.text.replace(PLACEHOLDER, (m, name: string) => (name in def.slots ? slotSpoken(def.slots[name], slots[name]) : m))
}

const LEAD = /^[\s.,;:!?…—–-]+/
const TRAIL = /\s+$/
const SPEAKABLE = /[A-Za-z0-9]/

/** The recordable part of a carrier piece: leading punctuation (it ends the previous segment) and spaces trimmed. */
export function pieceSpeech(raw: string): { text: string; lead: number; trail: number } | null {
  if (!SPEAKABLE.test(raw)) return null
  const lead = LEAD.exec(raw)?.[0].length ?? 0
  const trail = TRAIL.exec(raw)?.[0].length ?? 0
  return { text: raw.slice(lead, raw.length - trail), lead, trail }
}

/** The carrier pieces around a template's placeholders (n placeholders → n + 1 pieces, some maybe empty). */
export function carrierPieces(text: string): string[] {
  return text.split(/\{\w+\}/)
}

/** The pause before a segment, from the caption text between it and the previous one. */
export function gapFor(between: string): number {
  if (/[.!?]/.test(between)) return GAP.sentence
  if (/[,;:—–]/.test(between)) return GAP.comma
  return GAP.tight
}

/**
 * What to play for a filled-in template: one clip for `whole`, or the carrier
 * pieces and slot values back to back for `stitch`. `caption` is the filled
 * caption (registry `voiceText`), whose characters each segment is pinned to.
 */
export function planTemplate(
  templateId: string,
  def: TemplateDef,
  slots: Record<string, string | number>,
  caption: string,
): PlanSegment[] {
  if (renderMode(def) === 'whole') {
    return [{ key: wholeKey(templateId, def, slots), text: spokenFill(def, slots), capStart: 0, capEnd: caption.length, gap: 0 }]
  }
  const pieces = carrierPieces(def.text)
  const names = placeholders(def.text)
  const out: PlanSegment[] = []
  let p = 0
  let prevEnd = 0
  const push = (key: string, text: string, capStart: number, capEnd: number) => {
    out.push({ key, text, capStart, capEnd, gap: out.length ? gapFor(caption.slice(prevEnd, capStart)) : 0 })
    prevEnd = capEnd
  }
  pieces.forEach((raw, i) => {
    const sp = pieceSpeech(raw)
    if (sp) push(`${templateId}#${i}`, sp.text, p + sp.lead, p + raw.length - sp.trail)
    p += raw.length
    if (i < names.length) {
      const spec = def.slots[names[i]]
      const v = slots[names[i]]
      const shown = String(v)
      push(slotClipKey(spec, v), slotSpoken(spec, v), p, p + shown.length)
      p += shown.length
    }
  })
  return out
}

function checkTemplate(id: string, def: TemplateDef) {
  const used = placeholders(def.text)
  if (!used.length) throw new Error(`voice template "${id}" has no {slot}: make it a line`)
  for (const name of used) if (!def.slots[name]) throw new Error(`voice template "${id}" uses {${name}} but defines no such slot`)
  for (const [name, spec] of Object.entries(def.slots)) {
    if (!SLOT_NAME.test(name)) throw new Error(`voice template "${id}": bad slot name "${name}"`)
    if (!used.includes(name)) throw new Error(`voice template "${id}": slot "${name}" is never used in the text`)
    if ('numbers' in spec) {
      const [lo, hi] = spec.numbers
      if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 0 || hi < lo || hi > MAX_SPOKEN_NUMBER)
        throw new Error(`voice template "${id}": slot "${name}" needs whole numbers 0 ≤ min ≤ max ≤ ${MAX_SPOKEN_NUMBER}`)
    } else {
      if (!spec.words.length) throw new Error(`voice template "${id}": slot "${name}" has no words`)
      const slugs = new Map<string, string>()
      for (const w of spec.words) {
        if (w !== w.trim() || !w || /[{}]/.test(w)) throw new Error(`voice template "${id}": slot "${name}" has a bad word ${JSON.stringify(w)}`)
        const s = slugWord(w)
        if (slugs.has(s)) throw new Error(`voice template "${id}": slot "${name}" words ${JSON.stringify(slugs.get(s))} and ${JSON.stringify(w)} would share a clip name`)
        slugs.set(s, w)
      }
    }
  }
  const n = comboCount(def)
  if (def.render === 'whole' && n > WHOLE_MAX)
    throw new Error(`voice template "${id}" has ${n} combinations, too many to record whole (max ${WHOLE_MAX}): use render: 'stitch'`)
  if (def.text !== def.text.trim() || /\s{2}/.test(def.text)) throw new Error(`voice template "${id}": text has stray spaces`)
}

/** Every clip the packs need, keyed by clip key. Throws on anything that can't be recorded or named. */
export function buildVoiceCatalog(packs: VoicePack[], voice: string, sha1_10: (s: string) => string): VoiceCatalog {
  const clips: Record<string, CatalogClip> = {}
  const files = new Map<string, string>() // lower-cased file → key: macOS disks ignore case
  const add = (key: string, text: string, kind: ClipKind) => {
    const prev = clips[key]
    if (prev) {
      if (prev.text !== text) throw new Error(`voice clip "${key}" would say both ${JSON.stringify(prev.text)} and ${JSON.stringify(text)}`)
      return // a slot value shared by several templates
    }
    if (!text.trim() || /[{}]/.test(text)) throw new Error(`voice clip "${key}" has nothing sayable: ${JSON.stringify(text)}`)
    const file = clipFile(key)
    const other = files.get(file.toLowerCase())
    if (other) throw new Error(`voice clips "${other}" and "${key}" differ only in letter case (one file on a Mac)`)
    files.set(file.toLowerCase(), key)
    clips[key] = { text, hash: sha1_10(`${voice}|${text}`), kind, file }
  }

  const slotClips: { key: string; text: string; num: number | null }[] = []
  const ids = new Set<string>()
  for (const pack of [...packs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (!PACK_ID.test(pack.id) || pack.id === SLOT_PACK) throw new Error(`bad voice pack id "${pack.id}" (lower-case letters, digits and dashes; not "${SLOT_PACK}")`)
    if (ids.has(pack.id)) throw new Error(`duplicate voice pack id "${pack.id}"`)
    ids.add(pack.id)
    for (const [id, text] of Object.entries(pack.lines)) {
      if (!ITEM_ID.test(id)) throw new Error(`bad voice line id "${pack.id}/${id}" (letters, digits, _ and -)`)
      add(`${pack.id}/${id}`, text, 'line')
    }
    for (const [id, def] of Object.entries(pack.templates ?? {})) {
      const tid = `${pack.id}/${id}`
      if (!ITEM_ID.test(id)) throw new Error(`bad voice template id "${tid}" (letters, digits, _ and -)`)
      if (id in pack.lines) throw new Error(`"${tid}" is both a line and a template`)
      checkTemplate(tid, def)
      if (renderMode(def) === 'whole') {
        const names = Object.keys(def.slots).sort()
        const combo = (i: number, slots: Record<string, string | number>) => {
          if (i === names.length) {
            add(wholeKey(tid, def, slots), spokenFill(def, slots), 'whole')
            return
          }
          for (const v of slotValues(def.slots[names[i]])) combo(i + 1, { ...slots, [names[i]]: v })
        }
        combo(0, {})
        continue
      }
      carrierPieces(def.text).forEach((raw, i) => {
        const sp = pieceSpeech(raw)
        if (sp) add(`${tid}#${i}`, sp.text, 'piece')
      })
      for (const spec of Object.values(def.slots)) {
        for (const v of slotValues(spec)) {
          slotClips.push({ key: slotClipKey(spec, v), text: slotSpoken(spec, v), num: 'numbers' in spec ? Number(v) : null })
        }
      }
    }
  }
  // the shared slot values last: numbers in order, then words A–Z
  slotClips.sort((a, b) =>
    a.num !== null && b.num !== null ? a.num - b.num : a.num !== null ? -1 : b.num !== null ? 1 : a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
  )
  for (const s of slotClips) add(s.key, s.text, 'slot')
  return { voice, clips }
}
