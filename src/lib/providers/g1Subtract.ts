import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import type { SentenceToken } from '../../games/listenPlay/activities/numberSentenceSpec'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makePositionGuard } from './kShared'
import {
  askAnswer,
  askLine,
  askSentence,
  countBackHelp,
  fact,
  factProblem,
  familyHelp,
  partsHelp,
  takeAwayHelp,
  type FactAsk,
  type FactQuestion,
  type Mixup,
} from './g1Facts'

/**
 * Take-Away Dunes (1st grade, 1.OA.4, 1.OA.6, 1.OA.8): subtract within 20, a
 * number sentence on screen and a picture of the strategy under it, answered
 * with numeral cards (the `numberSentence` activity).
 *
 * - `takeAway` (Take away): counters on ten-frames, some taken away (tapped,
 *   crossed out), the rest counted; and count back (a frog hops back along
 *   numbered stones: "twelve, eleven, ten");
 * - `think` (Think addition): "13 − 5 = ?" thought of as "5 + ? = 13" (five
 *   counters, dashed spots up to thirteen, filled counting up), the missing
 *   number in "? + 4 = 9", "5 + ? = 12" and "12 − ? = 4", and fact families
 *   (a house: 3, 5 and 8 on the roof, four sentences in it).
 *
 * A round ramps (the shell `reset()`s the provider as a round starts): the
 * first questions are acted out and within ten, the later ones teen numbers
 * with the picture there to help. Never the same sentence twice in a round.
 */

export type G1SubtractMode = 'takeAway' | 'think'

export interface G1SubtractConfig {
  mode?: G1SubtractMode
}

const SKILL = {
  takeAway: { id: 'g1-take-away', label: 'taking away and counting back' },
  think: { id: 'g1-think-addition', label: 'thinking addition to subtract' },
  family: { id: 'g1-fact-families', label: 'fact families' },
}

const PRAISE: Record<keyof typeof SKILL, VoiceRef[]> = {
  takeAway: [fact('greatSubtracting'), { line: 'k-story-math/greatTakingAway' }],
  think: [fact('thinkPro'), fact('greatSubtracting')],
  family: [fact('thinkPro'), { line: 'k-story-math/smartThinking' }],
}

/**
 * What a child working out `a − b` tends to say instead: adding, counting
 * back from the start itself (one too many), the number at the start, or
 * the number taken. The first is the card shown; they take turns.
 */
function subMixups(a: number, b: number): Mixup[] {
  return shuffle<Mixup>([
    [a + b, fact('noteAdded')],
    [a - b + 1, fact('noteBackOne')],
    [a, fact('noteWhole')],
    [b, fact('noteTaken')],
  ])
}

/** Take away: `whole` counters, `take` of them tapped away. */
function takeQ(whole: number, take: number, act: boolean): FactQuestion {
  const q: FactAsk = { kind: 'sub', a: whole, b: take }
  return {
    sentence: askSentence(q),
    model: { kind: 'takeAway', whole, take },
    ask: askLine(q),
    hint: act ? undefined : fact('hintTake'),
    act: act ? { template: 'g1-facts/actTake', slots: { n: take } } : undefined,
    help: takeAwayHelp(whole, take),
    mixups: subMixups(whole, take),
  }
}

/** Count back: a frog on `start` hops back `back` stones. */
function backQ(start: number, back: number, act: boolean): FactQuestion {
  const q: FactAsk = { kind: 'sub', a: start, b: back }
  return {
    sentence: askSentence(q),
    model: { kind: 'countBack', start, back },
    ask: askLine(q),
    hint: fact('hintBack'),
    act: act ? fact('actBack') : undefined,
    help: countBackHelp(start, back),
    mixups: subMixups(start, back),
  }
}

/**
 * The missing part, thought of as addition: `part` counters and dashed spots
 * up to `whole`. Asked as "13 − 5 = ?" (think addition), "5 + ? = 13",
 * "? + 5 = 13" or "13 − ? = 5".
 */
function partsQ(q: FactAsk, act: boolean): FactQuestion {
  const answer = askAnswer(q)
  const { whole, part } =
    q.kind === 'sub' ? { whole: q.a, part: q.b } : q.kind === 'addB' ? { whole: q.c, part: q.a } : q.kind === 'addA' ? { whole: q.c, part: q.b } : q.kind === 'subB' ? { whole: q.a, part: q.c } : { whole: q.a + q.b, part: q.a }
  return {
    sentence: askSentence(q),
    model: { kind: 'parts', whole, part },
    ask: askLine(q),
    hint: fact(q.kind === 'sub' ? 'hintThink' : 'hintMissing'),
    act: act ? fact('actFill') : undefined,
    help: partsHelp(whole, part),
    // (a take-away sentence: the start, the number taken, or adding them; an addition: the whole, or the part we have)
    mixups: (q.kind === 'sub' || q.kind === 'subB'
      ? shuffle<Mixup>([
          [whole, fact('noteWhole')],
          [part, fact('noteKnown')],
          [whole + part, fact('noteAdded')],
        ])
      : shuffle<Mixup>([
          [whole, fact('noteIsWhole')],
          [part, fact('noteKnown')],
        ])
    ).concat([[answer + 1, null]]),
  }
}

/** Every way a family's sentence can hide one number and still be asked aloud. */
function familyBlanks(a: number, b: number): { sentence: number; at: number; ask: FactAsk }[] {
  const w = a + b
  const out: { sentence: number; at: number; ask: FactAsk }[] = []
  // a + b = w, b + a = w
  for (const [k, x, y] of [
    [0, a, b],
    [1, b, a],
  ] as const) {
    out.push({ sentence: k, at: 4, ask: { kind: 'add', a: x, b: y } })
    out.push({ sentence: k, at: 2, ask: { kind: 'addB', a: x, c: w } })
    out.push({ sentence: k, at: 0, ask: { kind: 'addA', b: y, c: w } })
  }
  // w − a = b, w − b = a
  for (const [k, x, y] of [
    [2, a, b],
    [3, b, a],
  ] as const) {
    out.push({ sentence: k, at: 4, ask: { kind: 'sub', a: w, b: x } })
    out.push({ sentence: k, at: 2, ask: { kind: 'subB', a: w, c: y } })
  }
  return out
}

/** A fact family's house: `a`, `b` and their whole on the roof, its four sentences, one number hidden. */
function familyQ(a: number, b: number): FactQuestion {
  const w = a + b
  const sentences: SentenceToken[][] = [
    [a, '+', b, '=', w],
    [b, '+', a, '=', w],
    [w, '−', a, '=', b],
    [w, '−', b, '=', a],
  ]
  const blanks = familyBlanks(a, b)
  const pick = blanks[randInt(0, blanks.length - 1)]
  const asked = sentences[pick.sentence].map((t, i) => (i === pick.at ? '?' : t)) as SentenceToken[]
  const answer = askAnswer(pick.ask)
  const others = [a, b, w].filter((v) => v !== answer)
  return {
    sentence: asked,
    model: { kind: 'family', a, b, whole: w, sentences, blank: pick.sentence },
    ask: askLine(pick.ask),
    hint: fact('hintFamily'),
    help: familyHelp(a, b),
    mixups: [...shuffle(others).map((v): Mixup => [v, fact('noteKnown')]), [answer + 1, null]],
  }
}

/** Two different parts of a family with a whole in [lo, hi] (each part 2–9). */
function familyParts(lo: number, hi: number): [number, number] {
  for (;;) {
    const a = randInt(2, 9)
    const b = randInt(2, 9)
    if (a !== b && a + b >= lo && a + b <= hi) return a < b ? [a, b] : [b, a]
  }
}

export function makeG1SubtractProvider(cfg: G1SubtractConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'takeAway'
  const places = makePositionGuard()
  let serial = 0
  let asked = 0
  const seen = new Set<string>()

  function make(i: number): { q: FactQuestion; skill: keyof typeof SKILL } {
    if (mode === 'takeAway') {
      switch (i) {
        case 0:
          return { q: takeQ(randInt(5, 8), randInt(2, 3), true), skill: 'takeAway' }
        case 1:
          return { q: takeQ(randInt(7, 10), randInt(2, 4), true), skill: 'takeAway' }
        case 2:
          return { q: backQ(randInt(9, 12), randInt(2, 3), true), skill: 'takeAway' }
        case 3: {
          const whole = randInt(11, 15)
          return { q: takeQ(whole, randInt(3, Math.min(6, whole - 2)), false), skill: 'takeAway' }
        }
        case 4:
          return { q: backQ(randInt(12, 18), randInt(2, 4), false), skill: 'takeAway' }
        default: {
          const whole = randInt(12, 18)
          return { q: takeQ(whole, randInt(4, Math.min(9, whole - 2)), false), skill: 'takeAway' }
        }
      }
    }
    // think addition, the missing number, fact families
    switch (i) {
      case 0: {
        const whole = randInt(7, 10)
        return { q: partsQ({ kind: 'sub', a: whole, b: randInt(3, Math.min(5, whole - 2)) }, true), skill: 'think' }
      }
      case 1: {
        const c = randInt(8, 12)
        const known = randInt(3, 6)
        return { q: partsQ(randInt(0, 1) ? { kind: 'addB', a: known, c } : { kind: 'addA', b: known, c }, false), skill: 'think' }
      }
      case 2: {
        const [a, b] = familyParts(5, 10)
        return { q: familyQ(a, b), skill: 'family' }
      }
      case 3: {
        const whole = randInt(11, 16)
        return { q: partsQ({ kind: 'sub', a: whole, b: randInt(4, Math.min(8, whole - 3)) }, false), skill: 'think' }
      }
      case 4: {
        const a = randInt(11, 15)
        return { q: partsQ({ kind: 'subB', a, c: randInt(Math.max(3, a - 10), 7) }, false), skill: 'think' }
      }
      default: {
        const [a, b] = familyParts(11, 18)
        return { q: familyQ(a, b), skill: 'family' }
      }
    }
  }

  return {
    topic: 'g1Subtract',
    reset() {
      asked = 0
      seen.clear()
      places.reset()
    },
    next(): ListenProblem {
      const i = asked++
      for (let tries = 0; ; tries++) {
        const { q, skill } = make(i % 6)
        const sig = q.sentence.join(' ')
        if (seen.has(sig) && tries < 12) continue
        seen.add(sig)
        const p = factProblem(q, places, { id: `g1sub-${serial++}`, topic: 'g1Subtract', subtopic: q.model.kind, skill: SKILL[skill], praise: PRAISE[skill] })
        places.note(p.options.indexOf(p.answer))
        return p
      }
    },
  }
}
