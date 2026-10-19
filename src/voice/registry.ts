import type { TemplateDef, VoicePack, VoiceRef } from './types'

/**
 * Every voice pack under `./packs/` (each file's default export), found at
 * build time, so adding a pack never touches a shared list.
 */
const modules = import.meta.glob<{ default: VoicePack }>('./packs/*.ts', { eager: true })

export const VOICE_PACKS: Record<string, VoicePack> = {}
for (const [path, mod] of Object.entries(modules)) {
  const pack = mod.default
  if (!pack?.id) throw new Error(`voice pack ${path} has no default export with an id`)
  if (VOICE_PACKS[pack.id]) throw new Error(`duplicate voice pack id "${pack.id}" (${path})`)
  VOICE_PACKS[pack.id] = pack
}

function split(id: string): [pack: string, key: string] {
  const i = id.indexOf('/')
  return i < 0 ? ['', id] : [id.slice(0, i), id.slice(i + 1)]
}

export function lineText(id: string): string | undefined {
  const [p, k] = split(id)
  return VOICE_PACKS[p]?.lines[k]
}

export function templateDef(id: string): TemplateDef | undefined {
  const [p, k] = split(id)
  return VOICE_PACKS[p]?.templates?.[k]
}

/** Fill a template's `{slot}` placeholders (numbers stay digits: captions show "7"). */
export function fillTemplate(text: string, slots: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in slots ? String(slots[name]) : m))
}

/**
 * The caption text of a voice reference: what the narrator says, as written.
 * Throws on an unknown line or template so a typo fails a test, not a child.
 */
export function voiceText(ref: VoiceRef): string {
  if ('line' in ref) {
    const t = lineText(ref.line)
    if (t === undefined) throw new Error(`unknown voice line "${ref.line}"`)
    return t
  }
  const def = templateDef(ref.template)
  if (!def) throw new Error(`unknown voice template "${ref.template}"`)
  for (const [name, spec] of Object.entries(def.slots)) {
    const v = ref.slots[name]
    if (v === undefined) throw new Error(`voice template "${ref.template}" is missing slot "${name}"`)
    const ok = 'numbers' in spec
      ? typeof v === 'number' && Number.isInteger(v) && v >= spec.numbers[0] && v <= spec.numbers[1]
      : spec.words.includes(String(v))
    if (!ok) throw new Error(`voice template "${ref.template}": slot "${name}" can't be ${JSON.stringify(v)}`)
  }
  return fillTemplate(def.text, ref.slots)
}
