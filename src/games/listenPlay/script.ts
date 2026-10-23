import type { GuideStep, GuideTarget } from '../../guide/store'
import type { Picture, PictureOption, ProblemAnswer } from '../../lib/problem'
import { countAlongOffsets, numberWord } from '../../lib/numberWords'
import { COUNT_MAX } from '../../voice/packs/listen'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { shapeSides } from './shapeGeometry'
import type { ListenActivityDef, ListenProblem, ListenTarget } from './types'

/**
 * What the Listen & Play guide says and points at, as plain data (the shell
 * runs it; tests read it). Guide ids on the screen:
 *   lp-picture   the question's picture panel
 *   lp-pair-<k>  half k of a two-picture panel (a `pair`)
 *   lp-card-<i>  answer card i
 *   lp-activity  the stage of a question answered by an activity (`ListenProblem.activity`)
 */
export const LP_PICTURE = 'lp-picture'
export const LP_ACTIVITY = 'lp-activity'
export const lpCard = (i: number) => `lp-card-${i}`
export const lpPair = (k: number) => `lp-pair-${k}`

/** Something the child (or the walkthrough) can count: the question picture, half of a pair, or a card. */
export type Where = 'picture' | 'pair0' | 'pair1' | number

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

/** Is there anything to show above (or beside) the cards? Without it the cards take the screen. */
export function hasPicturePanel(p: ListenProblem): boolean {
  return !!p.pair || !!questionPicture(p) || (!!p.visual && p.visual.kind !== 'none' && p.visual.kind !== 'wordProblem')
}

/** How many things in a picture can be counted one by one: a group's objects, or a flat shape's sides. */
export function countable(pic: Picture | null | undefined): { count: number; sides: boolean } | null {
  if (pic?.kind === 'group') return pic.count > 0 ? { count: pic.count, sides: false } : null
  if (pic?.kind === 'shape') {
    const n = shapeSides(pic.shape)
    return n ? { count: n, sides: true } : null
  }
  return null
}

/** A cue's target on screen (null: not on screen right now, e.g. a card already tried). */
function resolveTarget(p: ListenProblem, t: ListenTarget, open: number[]): { target: GuideTarget; one: boolean } | null {
  if (t === 'cards') return open.length ? { target: open.length === 1 ? lpCard(open[0]) : open.map(lpCard), one: open.length === 1 } : null
  if (t === 'picture') return hasPicturePanel(p) ? { target: LP_PICTURE, one: false } : null
  if (t === 'pair0' || t === 'pair1') return p.pair ? { target: lpPair(Number(t.slice(4))), one: false } : null
  const i = Number(t.slice(4))
  return open.includes(i) ? { target: lpCard(i), one: true } : null
}

/**
 * The guided question: the line, the picture lit up as it starts, the cards
 * (the ones still in play) on their cue with a hand gliding along them — it
 * never points at the answer alone, so it never gives it away. A provider's
 * `cues` can also light one card on its word ("yes", "no"), and
 * `nameCards` names each card after the question as it lights up, then the
 * hand glides along them all.
 */
export function questionSteps(p: ListenProblem, openCards: number[]): GuideStep[] {
  const picture = hasPicturePanel(p)
  const text = p.speech ? safeText(p.speech) : ''
  const cues = p.cues ?? [...(picture ? [{ target: 'picture' as const }] : []), { target: 'cards' as const, cue: /\btap\b/i.test(text) ? 'tap' : 0.5 }]
  const steps: GuideStep[] = []
  for (const c of cues) {
    const r = resolveTarget(p, c.target, openCards)
    if (!r) continue
    const isCards = c.target === 'cards' || c.target.startsWith('card')
    steps.push({
      target: r.target,
      cue: c.cue,
      hand: !isCards ? false : r.one ? 'tap' : 'sweep',
      pad: isCards ? 12 : 6,
    })
  }
  if (!steps.length) steps.push({ target: openCards.length === 1 ? lpCard(openCards[0]) : openCards.map(lpCard), hand: openCards.length === 1 ? 'tap' : 'sweep', pad: 12 })
  steps[0] = { ...steps[0], voice: p.speech ?? null }
  if (p.nameCards) {
    const cards = cardsFor(p)
    const named = openCards.filter((i) => cards[i]?.speech)
    for (const i of named) steps.push({ voice: cards[i].speech!, target: lpCard(i), hand: false, pad: 12, pause: 0.35 })
    // then all of them again, quietly, for the child's turn
    if (named.length) steps.push({ voice: null, target: openCards.length === 1 ? lpCard(openCards[0]) : openCards.map(lpCard), hand: openCards.length === 1 ? 'tap' : 'sweep', pad: 12 })
  }
  return steps
}

/** Asking an activity's question: its own steps, else the line with the activity's area lit. */
export function activityAskSteps(p: ListenProblem, def: ListenActivityDef | null, misses = 0): GuideStep[] {
  const steps = def?.askSteps && p.activity ? def.askSteps(p, p.activity, misses) : []
  return steps.length ? steps : [{ voice: p.speech ?? null, target: LP_ACTIVITY, hand: false, pad: 6 }]
}

function safeText(ref: VoiceRef): string {
  try {
    return voiceText(ref)
  } catch {
    return ''
  }
}

/** One thing the walkthrough counts: where it is, how many, and whether it's a shape's sides. */
export interface CountPlan {
  where: Where
  target: string
  count: number
  sides: boolean
}

/**
 * What the walkthrough counts after a wrong pick of card `picked` (see
 * `ListenWalkthrough`): the question's group or shape by default, the picked
 * card, or every group on screen. Empty when there's nothing to count.
 */
export function walkthroughCounts(p: ListenProblem, cards: PictureOption[], picked: number, open: number[]): CountPlan[] {
  const mode = p.walkthrough ?? 'count'
  const card = (i: number): CountPlan | null => {
    const c = countable(cards[i]?.picture)
    return c ? { where: i, target: lpCard(i), ...c } : null
  }
  const some = (xs: (CountPlan | null)[]) => xs.filter((x): x is CountPlan => !!x)
  switch (mode) {
    case 'none':
    case 'countUp':
      return []
    case 'each':
      if (p.pair) {
        return some(
          p.pair.map((pic, k) => {
            const c = countable(pic)
            return c ? { where: k === 0 ? ('pair0' as const) : ('pair1' as const), target: lpPair(k), ...c } : null
          }),
        )
      }
      return some(open.map(card))
    case 'picked':
      return some([card(picked)])
    case 'answer':
      return some([card(cards.findIndex((c) => c.value === p.answer))])
    case 'count': {
      const q = countable(questionPicture(p))
      if (q) return [{ where: 'picture', target: LP_PICTURE, ...q }]
      return cards[picked]?.picture.kind === 'group' ? some([card(picked)]) : []
    }
  }
}

/**
 * "One, two, three…" with the thing lit up, and `onCount(i)` as the i-th
 * number word is said (light object i). With `intro`, "Let's count
 * together." (or the line given) first.
 */
export function countAlongSteps(count: number, target: string, onCount: (i: number) => void, intro: VoiceRef | null = { line: 'listen/countTogether' }): GuideStep[] {
  const n = Math.min(Math.max(0, Math.floor(count)), COUNT_MAX)
  if (!n) return []
  const ref = { line: `listen/count${n}` }
  const offsets = countAlongOffsets(voiceText(ref))
  return [
    ...(intro ? [{ voice: intro, target, hand: false as const, pad: 6 }] : []),
    { voice: ref, target, hand: false, pad: 6, pause: 0.6, events: offsets.map((char, i) => ({ char, run: () => onCount(i) })) },
  ]
}

/**
 * The walkthrough's count-along for a plan: "Let's count together." (or
 * "…the sides.", or "…each group." for two), then each thing counted in
 * turn, its parts lighting up one by one (`onCount(where, i)`).
 */
export function walkthroughSteps(plan: CountPlan[], onCount: (where: Where, i: number) => void, intro = true): GuideStep[] {
  if (!plan.length) return []
  const introLine = plan.length > 1 ? 'listen/countEach' : plan[0].sides ? 'listen/countSides' : 'listen/countTogether'
  const steps: GuideStep[] = intro ? [{ voice: { line: introLine }, target: plan.length > 1 ? plan.map((c) => c.target) : plan[0].target, hand: false, pad: 6 }] : []
  for (const c of plan) steps.push(...countAlongSteps(c.count, c.target, (i) => onCount(c.where, i), null))
  return steps
}

/**
 * After a miss, the answer card lit up as `reteach` names it ("This is the
 * letter A."): no hand, no tap: the child taps it on the next try. Empty
 * without a `reteach` (or when the answer card isn't on screen).
 */
export function reteachSteps(p: ListenProblem, cards: PictureOption[]): GuideStep[] {
  if (!p.reteach) return []
  const i = cards.findIndex((c) => c.value === p.answer)
  return i < 0 ? [] : [{ voice: p.reteach, target: lpCard(i), hand: false, pad: 12, pause: 0.4 }]
}

/**
 * Comparing numerals ("Which number is bigger?"): count up to the biggest
 * card, each numeral card lit as its number is said — the one said later is
 * the bigger one.
 */
export function countUpSteps(cards: PictureOption[], open: number[]): GuideStep[] {
  const nums = open
    .map((i) => ({ i, pic: cards[i]?.picture }))
    .flatMap(({ i, pic }) => (pic?.kind === 'numeral' && Number.isInteger(pic.n) && pic.n >= 1 && pic.n <= COUNT_MAX ? [{ i, n: pic.n }] : []))
    .sort((a, b) => a.n - b.n)
  if (!nums.length) return []
  const top = nums[nums.length - 1].n
  const all = nums.map((x) => lpCard(x.i))
  return [
    { voice: { line: 'listen/countTogether' }, target: all, hand: false, pad: 12 },
    // the numerals stay lit as the count starts; each one alone as its number is said
    { voice: { line: `listen/count${top}` }, pause: 0.6, target: all, hand: false, pad: 12 },
    ...nums.map((x): GuideStep => ({ target: lpCard(x.i), cue: numberWord(x.n), hand: false, pad: 12 })),
  ]
}

/** Praise, taking turns. */
export const PRAISE: VoiceRef[] = [{ line: 'ui/greatJob' }, { line: 'listen/youDidIt' }, { line: 'listen/thatsRight' }]

/** The praise for item `idx`: the question's own lines take turns with the kit's. */
export function praiseFor(p: ListenProblem, idx: number): VoiceRef {
  const pool = p.praise?.length ? [...p.praise, ...PRAISE] : PRAISE
  return pool[idx % pool.length]
}

/** Stars for a round: never 0 (a K child who finished, with help, still earns one). */
export function listenStars(firstTryCorrect: number, total: number): number {
  if (firstTryCorrect >= total) return 3
  if (firstTryCorrect >= Math.ceil(total * 0.6)) return 2
  return 1
}
