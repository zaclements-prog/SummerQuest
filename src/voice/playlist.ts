import { planTemplate } from './catalog'
import type { VoicePlan } from './player'
import { templateDef, voiceText } from './registry'
import type { VoiceRef } from './types'

/**
 * What to play for a voice reference: its caption and its clips (one for a
 * line or a `whole` template; the carrier pieces and the slot values for a
 * `stitch` template). Throws on an unknown line or a bad slot, like voiceText.
 */
export function planVoice(ref: VoiceRef): VoicePlan {
  const caption = voiceText(ref)
  if ('line' in ref) return { caption, segments: [{ key: ref.line, text: caption, capStart: 0, capEnd: caption.length, gap: 0 }] }
  return { caption, segments: planTemplate(ref.template, templateDef(ref.template)!, ref.slots, caption) }
}

/** The same reference always gives the same string (slots in name order): a React dependency. */
export function voiceRefKey(ref: VoiceRef): string {
  if ('line' in ref) return JSON.stringify({ line: ref.line })
  const slots: Record<string, string | number> = {}
  for (const k of Object.keys(ref.slots).sort()) slots[k] = ref.slots[k]
  return JSON.stringify({ template: ref.template, slots })
}
