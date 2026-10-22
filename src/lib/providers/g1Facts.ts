import type { ListenProblem } from '../../games/listenPlay/types'
import { solveSentence, type FactModel, type HelpBeat, type NumberSentenceSpec, type SentenceToken } from '../../games/listenPlay/activities/numberSentenceSpec'
import { G1_ADD_A_MAX, G1_CHANGE_MAX, leftLineId, makeLineId } from '../../voice/packs/g1-facts'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { shuffle } from '../random'
import { numeralCard } from './kMathStory'

/**
 * What Adding Mesa and Take-Away Dunes share (1st grade, 1.OA.3–8): a
 * `numberSentence` question (src/games/listenPlay/activities/NumberSentence.tsx)
 * built from a sentence and a model, its question and help said with the
 * `g1-facts` pack, answered with three numeral cards: the right one, a likely
 * mix-up (counting the first number again, adding instead of taking away, just
 * the ten, just the double) and a near miss, each wrong one with a word.
 */

export const G1_FACT_MAX = 20

export const fact = (id: string): VoiceRef => ({ line: `g1-facts/${id}` })
const said = (n: number): VoiceRef => ({ template: 'listen/number', slots: { n } })
const make = (a: number, b: number): VoiceRef => fact(makeLineId(a, b))

/** What the question asks: a sum, a difference, or a missing number. */
export type FactAsk =
  /** a + b = ? */
  | { kind: 'add'; a: number; b: number }
  /** a − b = ? */
  | { kind: 'sub'; a: number; b: number }
  /** a + ? = c */
  | { kind: 'addB'; a: number; c: number }
  /** ? + b = c */
  | { kind: 'addA'; b: number; c: number }
  /** a − ? = c */
  | { kind: 'subB'; a: number; c: number }

export function askSentence(q: FactAsk): SentenceToken[] {
  switch (q.kind) {
    case 'add':
      return [q.a, '+', q.b, '=', '?']
    case 'sub':
      return [q.a, '−', q.b, '=', '?']
    case 'addB':
      return [q.a, '+', '?', '=', q.c]
    case 'addA':
      return ['?', '+', q.b, '=', q.c]
    case 'subB':
      return [q.a, '−', '?', '=', q.c]
  }
}

export function askAnswer(q: FactAsk): number {
  switch (q.kind) {
    case 'add':
      return q.a + q.b
    case 'sub':
      return q.a - q.b
    case 'addB':
      return q.c - q.a
    case 'addA':
      return q.c - q.b
    case 'subB':
      return q.a - q.c
  }
}

/** How the question is said ("What is 8 plus 5?"). */
export function askLine(q: FactAsk): VoiceRef {
  switch (q.kind) {
    case 'add':
      return { template: 'g1-facts/add', slots: { a: q.a, b: q.b } }
    case 'sub':
      return { template: 'g1-facts/sub', slots: { a: q.a, b: q.b } }
    case 'addB':
      return { template: 'g1-facts/addB', slots: { a: q.a, c: q.c } }
    case 'addA':
      return { template: 'g1-facts/addA', slots: { b: q.b, c: q.c } }
    case 'subB':
      return { template: 'g1-facts/subB', slots: { a: q.a, c: q.c } }
  }
}

/** Every question the pack can say (the numbers its templates are recorded for). */
export function askInRange(q: FactAsk): boolean {
  const ok = (v: number, lo: number, hi: number) => Number.isInteger(v) && v >= lo && v <= hi
  switch (q.kind) {
    case 'add':
      return ok(q.a, 1, G1_ADD_A_MAX) && ok(q.b, 1, G1_ADD_A_MAX) && q.a + q.b <= G1_FACT_MAX
    case 'sub':
      return ok(q.a, 2, 20) && ok(q.b, 1, G1_CHANGE_MAX) && q.a - q.b >= 1
    case 'addB':
      return ok(q.a, 1, G1_CHANGE_MAX) && ok(q.c, 2, 20) && q.c - q.a >= 1
    case 'addA':
      return ok(q.b, 1, G1_CHANGE_MAX) && ok(q.c, 2, 20) && q.c - q.b >= 1
    case 'subB':
      return ok(q.a, 2, 20) && ok(q.c, 1, G1_CHANGE_MAX) && q.a - q.c >= 1
  }
}

// ── the help after a miss, per model ─────────────────────────────────────────

/** Count on from `start`: "Start at eight." then each dot as its number is said, then "Eight and three make eleven." */
export function countOnHelp(start: number, on: number, smallerFirst: boolean): HelpBeat[] {
  return [
    ...(smallerFirst ? [{ voice: fact('biggerFirst'), do: { kind: 'light', part: 'start' } } as HelpBeat] : []),
    { voice: fact(`startAt-${start}`), do: { kind: 'light', part: 'start' } },
    ...Array.from({ length: on }, (_, i): HelpBeat => ({ voice: said(start + i + 1), do: { kind: 'dot', i, n: start + i + 1 } })),
    { voice: make(start, on) },
  ]
}

/** Counting every counter of two rows, one beat each ("one!" … "twelve!"): a double's check. */
function countAll(n: number): HelpBeat[] {
  return Array.from({ length: n }, (_, i): HelpBeat => ({ voice: said(i + 1), do: { kind: 'count', i, n: i + 1 } }))
}

/** A double: "Double six is twelve." then a count to be sure. */
export function doubleHelp(n: number): HelpBeat[] {
  return [{ voice: fact(`double-${n}`), do: { kind: 'light', part: 'model' } }, ...countAll(2 * n)]
}

/** A near double (n and n + 1): "Six and six make twelve. One more is thirteen." the extra one lit. */
export function nearHelp(n: number): HelpBeat[] {
  return [{ voice: fact(`near-${n}`), do: { kind: 'light', part: 'extra' } }, ...countAll(2 * n + 1)]
}

/** A turn-around fact: the rows swap, "Turn it around…", then "Five and three make eight." */
export function turnHelp(first: number, second: number): HelpBeat[] {
  return [
    { voice: fact('turnAround'), do: { kind: 'turn' } },
    { voice: make(first, second), do: { kind: 'light', part: 'model' } },
  ]
}

/** Make ten: "Eight needs two more to make ten." two counters move over ("one!", "two!"), "Ten and three more is thirteen." */
export function makeTenHelp(a: number, b: number): HelpBeat[] {
  const need = 10 - a
  return [
    { voice: fact(`needs-${a}`), do: { kind: 'light', part: 'first' } },
    ...Array.from({ length: need }, (_, i): HelpBeat => ({ voice: said(i + 1), do: { kind: 'move', n: i + 1 } })),
    { voice: fact(`tenAnd-${a + b - 10}`), do: { kind: 'light', part: 'model' } },
  ]
}

/** Take away: "Take away three." each one crossed out ("one!", "two!", "three!"), then what is left counted, "Six are left." */
export function takeAwayHelp(whole: number, take: number): HelpBeat[] {
  const left = whole - take
  return [
    { voice: fact(`take-${take}`), do: { kind: 'light', part: 'model' } },
    ...Array.from({ length: take }, (_, i): HelpBeat => ({ voice: said(i + 1), do: { kind: 'take', n: i + 1 } })),
    ...Array.from({ length: left }, (_, i): HelpBeat => ({ voice: said(i + 1), do: { kind: 'count', i, n: i + 1 } })),
    { voice: fact(leftLineId(left)) },
  ]
}

/** Count back: "Start at twelve." "Hop back three." each hop said as it lands, "We land on nine." */
export function countBackHelp(start: number, back: number): HelpBeat[] {
  return [
    { voice: fact(`startAt-${start}`), do: { kind: 'light', part: 'start' } },
    { voice: fact(`hop-${back}`), do: { kind: 'light', part: 'model' } },
    ...Array.from({ length: back }, (_, i): HelpBeat => ({ voice: said(start - i - 1), do: { kind: 'hop', to: start - i - 1 } })),
    { voice: fact(`land-${start - back}`) },
  ]
}

/** Think addition / the missing part: "Five plus what makes thirteen?" each empty spot filled, counted up, "Five and eight make thirteen." */
export function partsHelp(whole: number, part: number): HelpBeat[] {
  const missing = whole - part
  return [
    { voice: { template: 'g1-facts/addB', slots: { a: part, c: whole } }, do: { kind: 'light', part: 'start' } },
    ...Array.from({ length: missing }, (_, i): HelpBeat => ({ voice: said(part + i + 1), do: { kind: 'fill', n: i + 1 } })),
    { voice: make(part, missing), do: { kind: 'light', part: 'model' } },
  ]
}

/** A fact family: "Three and five make eight." (the roof), the family rule (the house). */
export function familyHelp(a: number, b: number): HelpBeat[] {
  return [
    { voice: make(a, b), do: { kind: 'light', part: 'roof' } },
    { voice: fact('familyRule'), do: { kind: 'light', part: 'house' } },
  ]
}

// ── the cards ────────────────────────────────────────────────────────────────

/** A wrong card and the word said about it (null: just a near miss). */
export type Mixup = [value: number, note: VoiceRef | null]

/**
 * Three cards: the answer, the first likely mix-up that fits, and a near
 * miss (one off), all different, all 1–20 (0 only when it is the answer).
 */
export function factCards(answer: number, mixups: readonly Mixup[]): { cards: number[]; notes: Map<number, VoiceRef | null> } {
  const ok = (v: number) => Number.isInteger(v) && v >= 1 && v <= G1_FACT_MAX && v !== answer
  const cards: number[] = [answer]
  const notes = new Map<number, VoiceRef | null>()
  const add = (v: number, note: VoiceRef | null) => {
    if (cards.length < 3 && ok(v) && !cards.includes(v)) {
      cards.push(v)
      notes.set(v, note)
    }
  }
  const mix = mixups.filter(([v]) => ok(v))
  if (mix.length) add(mix[0][0], mix[0][1])
  for (const v of shuffle([answer - 1, answer + 1])) if (cards.length < 3 && !mixups.some(([m]) => m === v)) add(v, null)
  for (const [v, n] of mix) add(v, n)
  for (const v of [answer + 1, answer - 1, answer + 2, answer - 2, answer + 3, answer - 3]) add(v, null)
  return { cards, notes }
}

/** Keeps the answer moving between the cards (kShared's position guard). */
export interface Arranger {
  arrange<T>(options: readonly T[], answer: T): T[]
}

export interface FactQuestion {
  sentence: SentenceToken[]
  given?: SentenceToken[]
  model: FactModel
  ask: VoiceRef
  hint?: VoiceRef
  act?: VoiceRef
  help: HelpBeat[]
  mixups: Mixup[]
}

/**
 * A `numberSentence` question: the activity, its numeral cards (in `places`'
 * order), a word for each wrong card, and what is said as its caption.
 */
export function factProblem(q: FactQuestion, places: Arranger, base: Pick<ListenProblem, 'id' | 'topic' | 'subtopic' | 'skill' | 'praise'>): ListenProblem {
  const answer = solveSentence(q.sentence)
  if (answer === null) throw new Error(`g1 facts: "${q.sentence.join(' ')}" has no single answer`)
  const { cards, notes } = factCards(answer, q.mixups)
  const options = places.arrange(cards, answer)
  const spec: NumberSentenceSpec = {
    kind: 'numberSentence',
    sentence: q.sentence,
    given: q.given,
    model: q.model,
    cards: options,
    answer,
    ask: q.ask,
    hint: q.hint,
    act: q.act,
    help: q.help,
  }
  return {
    ...base,
    difficulty: Math.max(answer, ...q.sentence.filter((t): t is number => typeof t === 'number')),
    prompt: [q.ask, q.hint, q.act].filter((r): r is VoiceRef => !!r).map(voiceText).join(' '),
    options,
    answer,
    speech: q.ask,
    pictureOptions: options.map(numeralCard),
    notes: options.map((v) => (v === answer ? null : (notes.get(v) ?? null))),
    activity: spec,
  }
}
