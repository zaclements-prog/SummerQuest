import type { GuideStep } from '../../guide/store'
import type { Picture, PictureOption, ProblemAnswer } from '../../lib/problem'
import { countAlongOffsets } from '../../lib/numberWords'
import { COUNT_MAX } from '../../voice/packs/listen'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import type { ListenProblem } from './types'

/**
 * What the Listen & Play guide says and points at, as plain data (the shell
 * runs it; tests read it). Guide ids on the screen:
 *   lp-picture   the question's picture panel
 *   lp-card-<i>  answer card i
 */
export const LP_PICTURE = 'lp-picture'
export const lpCard = (i: number) => `lp-card-${i}`

/** The cards to show: the provider's pictures, or plain numerals / words for its options. */
export function cardsFor(p: ListenProblem): PictureOption[] {
  if (p.pictureOptions?.length) return p.pictureOptions
  return p.options.map((v: ProblemAnswer) => ({
    value: v,
    picture: typeof v === 'number' ? { kind: 'numeral', n: v } : { kind: 'word', text: String(v) },
    speech: typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= COUNT_MAX ? { template: 'listen/number', slots: { n: v } } : undefined,
  }))
}

/** The question's own picture: `picture`, or an emoji array visual read as a group. */
export function questionPicture(p: ListenProblem): Picture | null {
  if (p.picture) return p.picture
  const v = p.visual
  if (v?.kind === 'array' && v.itemEmoji) return { kind: 'group', count: v.rows * v.cols, emoji: v.itemEmoji }
  return null
}

function hasPicturePanel(p: ListenProblem): boolean {
  return !!questionPicture(p) || (!!p.visual && p.visual.kind !== 'none' && p.visual.kind !== 'wordProblem')
}

/**
 * The guided question: the line, the picture lit up as it starts, the cards
 * (the ones still in play) on their cue with a hand gliding along them — it
 * never points at one card, so it never gives the answer away.
 */
export function questionSteps(p: ListenProblem, openCards: number[]): GuideStep[] {
  const cards = openCards.map(lpCard)
  const picture = hasPicturePanel(p)
  const text = p.speech ? safeText(p.speech) : ''
  const cues = (p.cues ?? [...(picture ? [{ target: 'picture' as const }] : []), { target: 'cards' as const, cue: /\btap\b/i.test(text) ? 'tap' : 0.5 }]).filter(
    (c) => c.target === 'cards' || picture,
  )
  if (!cues.length) cues.push({ target: 'cards', cue: undefined })
  return cues.map((c, i) => ({
    ...(i === 0 ? { voice: p.speech ?? null } : {}),
    target: c.target === 'picture' ? LP_PICTURE : cards.length === 1 ? cards[0] : cards,
    cue: c.cue,
    hand: c.target === 'picture' ? false : cards.length === 1 ? 'tap' : 'sweep',
    pad: c.target === 'picture' ? 6 : 12,
  }))
}

function safeText(ref: VoiceRef): string {
  try {
    return voiceText(ref)
  } catch {
    return ''
  }
}

/** The group the walkthrough counts after a wrong pick: the question's, else the picked card's. */
export function walkthroughGroup(p: ListenProblem, cards: PictureOption[], picked: number): { where: 'picture' | number; count: number; target: string } | null {
  const qp = questionPicture(p)
  if (qp?.kind === 'group') return { where: 'picture', count: qp.count, target: LP_PICTURE }
  const cp = cards[picked]?.picture
  if (cp?.kind === 'group') return { where: picked, count: cp.count, target: lpCard(picked) }
  return null
}

/**
 * "Let's count together." then "One, two, three…" with the group lit up, and
 * `onCount(i)` as the i-th number word is said (light object i).
 */
export function countAlongSteps(count: number, target: string, onCount: (i: number) => void): GuideStep[] {
  const n = Math.min(Math.max(0, Math.floor(count)), COUNT_MAX)
  if (!n) return []
  const ref = { line: `listen/count${n}` }
  const offsets = countAlongOffsets(voiceText(ref))
  return [
    { voice: { line: 'listen/countTogether' }, target, hand: false, pad: 6 },
    { voice: ref, target, hand: false, pad: 6, pause: 0.6, events: offsets.map((char, i) => ({ char, run: () => onCount(i) })) },
  ]
}

/** Praise, taking turns. */
export const PRAISE: VoiceRef[] = [{ line: 'ui/greatJob' }, { line: 'listen/youDidIt' }, { line: 'listen/thatsRight' }]

/** Stars for a round: never 0 (a K child who finished, with help, still earns one). */
export function listenStars(firstTryCorrect: number, total: number): number {
  if (firstTryCorrect >= total) return 3
  if (firstTryCorrect >= Math.ceil(total * 0.6)) return 2
  return 1
}
